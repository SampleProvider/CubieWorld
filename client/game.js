var queryString = window.location.search;

var urlParams = new URLSearchParams(queryString);

var page_type = urlParams.get('page_type');

var socket = io();

var ctxRaw = document.getElementById("ctx");
var ctx = ctxRaw.getContext('2d');
ctx.canvas.width = 600;
ctx.canvas.height = 600;
ctx.textAlign = "center";
ctx.textBaseline = "center";
ctx.font = "30px pixel";

var gameMessages = document.getElementById("gameMessages");
var gameMessageStyle = 'style="color:#000000"';
var println = function(message){
    var scroll = false;
    if(gameMessages.scrollTop + gameMessages.clientHeight >= gameMessages.scrollHeight - 5){
        scroll = true;
    }
    var d = new Date();
    var m = '' + d.getMinutes();
    if(m.length === 1){
        m = '' + 0 + m;
    }
    if(m === '0'){
        m = '00';
    }
    gameMessages.innerHTML += '<div class="UI-text-light gameMessage" ' + gameMessageStyle + '>' + "[" + d.getHours() + ":" + m + "] " + message + '</div>'
    if(scroll){
        gameMessages.scrollTop = gameMessages.scrollHeight;
    }
    return true;
}
var printStyle = function(style){
    gameMessageStyle = style;
}
var max = Math.max;
var min = Math.min;
var random = Math.random;
var round = Math.round;
var floor = Math.floor;
var ceil = Math.ceil;
var sqrt = Math.sqrt;
var mouseX;
var mouseY;

var fill = function(r,g,b,a){
    if(a === undefined){
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        return true;
    }
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (a / 255) + ')';
    return true;
}
var stroke = function(r,g,b,a){
    if(a === undefined){
        ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        return true;
    }
    ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (a / 255) + ')';
    return true;
}
var strokeWeight = function(weight){
    ctx.lineWidth = weight;
}
var noStroke = function(){
    stroke(0,0,0,0);
}
var rect = function(x,y,width,height,radius){
    if(!radius){
        ctx.fillRect(x,y,width,height);
        ctx.strokeRect(x,y,width,height);
        ctx.stroke();
        return true;
    }
    ctx.fillRect(x + radius,y + radius,max(width - radius * 2,0),max(height - radius * 2,0));
    ctx.fillRect(x,y + radius,radius,max(height - radius * 2,0));
    ctx.fillRect(x + radius,y,max(width - radius * 2,0),radius);
    ctx.fillRect(x + width - radius,y + radius,radius,max(height - radius * 2,0));
    ctx.fillRect(x + radius,y + height - radius,max(width - radius * 2,0),radius);
    ctx.arc(x + radius,y + radius,radius,90,180);
    ctx.fill();
    ctx.arc(x + width - radius,y + radius,radius,0,90);
    ctx.fill();
    ctx.arc(x + width - radius,y + height - radius,radius,0,270);
    ctx.fill();
    ctx.arc(x + radius,y + height - radius,radius,180,270);
    ctx.fill();
    return true;
}
var text = function(text,x,y){
    var textLines = text.split('\n');
    for(var i in textLines){
        ctx.fillText(textLines[i],x,y - textLines.length * 20 + i * 40);
    }
}

document.getElementById("signIn").onclick = function(){
    document.getElementById("pageDiv").style.display = 'none';
    document.getElementById("gameDiv").style.display = 'inline-block';
    socket.emit('signIn',{username:document.getElementById("username").value});
}

var version = '1.0.0';
var levelCreator = urlParams.get('levelCreator') || false;
var level = parseInt(urlParams.get('level')) || 1;
var levelDebug = urlParams.get('levelDebug') || false;
var levelTeleport = urlParams.get('levelTeleport') || false;
var hitboxColor = [0,0,0];
var gridSize = parseInt(urlParams.get('gridSize')) || 30;
var blockGravity = false;
var cubieGravity = true;
var monsterGravity = true;
var gravitySpd = parseFloat(urlParams.get('gravitySpd')) || 0.5;
var bounceSpd = parseFloat(urlParams.get('bounceSpd')) || 1;

//Code{

var spawnPositions = [
    [0,0],//0
    [0,540],//1
    [0,540],//2
    [0,540],//3
    [0,0],//4
    [0,540],//5
    [0,540],//6
    [0,540],//7
    [0,540],//8
    [0,540],//9
    [0,540],//10
    [0,540],//11
    [0,540],//12
    [0,90],//13
    [0,540],//14
    [0,540],//15
    [0,540],//16
    [0,540],//17
    [480,390],//18
    [0,540],//19
];

var levelMouseStartX = 0;
var levelMouseStartY = 0;

var powerUsed = 0;
var lastBlock = [];
var mousePower = 'none';

var drawText = false;
var textToDraw = '';

var time = -1;

var isClicking = false;
var paused = false;
var mouseIn = false;

var resetLevel = function(){}

var Entity = function(param){
    var self = {
        id:random(0,1),
        x:0,
        y:0,
        spdX:0,
        spdY:0,
        width:0,
        height:0,
        map:0,
    }
    if(param){
        if(param.id){
            self.id = param.id;
        }
        if(param.x){
            self.x = param.x;
        }
        if(param.y){
            self.y = param.y;
        }
        if(param.spdX){
            self.spdX = param.spdX;
        }
        if(param.spdY){
            self.spdY = param.spdY;
        }
        if(param.width){
            self.width = param.width;
        }
        if(param.height){
            self.height = param.height;
        }
        if(param.map){
            self.map = param.map;
        }
    }
    self.isColliding = function(pt){
        if(self.x + self.width > pt.x && self.x < pt.x + pt.width && self.y + self.height > pt.y && self.y < pt.y + pt.height){
            return true;
        }
        return false;
    }
    return self;
}

var Cubie = function(param){
    var self = Entity(param);
    self.username = param.username;
    self.hp = 1000;
    self.hpMax = 1000;
    self.level = 1;
    self.spawnX = spawnPositions[self.level][0];
    self.spawnY = spawnPositions[self.level][1];
    self.x = self.spawnX;
    self.y = self.spawnY;
    self.lastX = self.x;
    self.lastY = self.y;
    self.shade = {
        r:255,
        g:255,
        b:255,
        a:0,
    }
    self.keyPress = {
        up:false,
        canJump:false,
        down:false,
        left:false,
        right:false,
        onBlock:false,
    }
    self.deaths = 0;
    self.update = function(){
        self.lastX = self.x;
        self.lastY = self.y;
        if(self.keyPress.up && self.keyPress.canJump){
            self.spdY -= sqrt(self.width / 30 * self.height / 30) * 9;
            self.keyPress.canJump = false;
        }
        if(self.keyPress.down && !self.keyPress.onBlock){
            self.spdY += sqrt(self.width / 30 * self.height / 30) * 2;
        }
        if(self.keyPress.left){
            self.spdX -= sqrt(self.width / 30 * self.height / 30);
        }
        if(self.keyPress.right){
            self.spdX += sqrt(self.width / 30 * self.height / 30);
        }
        if(!self.keyPress.onBlock && cubieGravity){
            self.spdY += sqrt(self.width / 30 * self.height / 30) * gravitySpd;
        }
        self.spdY *= 0.98;
        self.spdX *= 0.87;
        if(!cubieGravity){
            if(self.keyPress.up){
                self.spdY = sqrt(self.width / 30 * self.height / 30) * -5;
            }
            else if(self.keyPress.down){
                self.spdY = sqrt(self.width / 30 * self.height / 30) * 5;
            }
            else{
                self.spdY = 0;
            }
            if(self.keyPress.left){
                self.spdX = sqrt(self.width / 30 * self.height / 30) * -5;
            }
            else if(self.keyPress.right){
                self.spdX = sqrt(self.width / 30 * self.height / 30) * 5;
            }
            else{
                self.spdX = 0;
            }
        }
        self.x += self.spdX;
        self.y += self.spdY;
        if(self.y > 600 - self.height){
            self.y = 600 - self.height;
            self.spdY = 0;
            if(cubieGravity){
                self.spdX = 0;
                self.keyPress.canJump = true;
                self.x = self.spawnX;
                self.y = self.spawnY;
                self.lastX = self.spawnX;
                self.lastY = self.spawnY;
                self.shade = {
                    r:255,
                    g:255,
                    b:255,
                    a:255,
                }
                self.deaths += 1;
                resetLevel();
            }
        }
        if(self.y < 0){
            self.y = 0;
            self.spdY = 0;
        }
        if(self.x > 600 - self.width){
            self.x = 600 - self.width;
            self.spdX = 0;
        }
        if(self.x < 0){
            self.x = 0;
            self.spdX = 0;
        }
        self.keyPress.onBlock = false;
    }
    self.draw = function(){
        strokeWeight(1);
        fill(255, 0, 0);
        stroke(0, 0, 0);
        rect(self.x,self.y,self.width,self.height);
        fill(0, 0, 0);
        rect(self.x + self.width / 5,self.y + self.height / 5,self.width / 5,self.height / 5);
        rect(self.x + 3 * self.width / 5,self.y + self.height / 5,self.width / 5,self.height / 5);
        rect(self.x + self.width / 5,self.y + 3 * self.height / 5,3 * self.width / 5,self.height / 5);
        if(levelDebug){
            strokeWeight(3);
            stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
            fill(0, 0, 0, 0);
            rect(self.x,self.y,self.width,self.height);
        }
        noStroke();
        fill(self.shade.r,self.shade.g,self.shade.b,self.shade.a);
        self.shade.a = max(self.shade.a - 10,0);
        rect(0,0,600,600);
    }
    return self;
}

var cubie = Cubie({
    username:'cubie',
    width:30,
    height:30,
});

var Monster = function(param){
    var self = Entity(param);
    self.lastX = self.x;
    self.lastY = self.y;
    self.keyPress = {
        up:false,
        canJump:false,
        down:false,
        left:false,
        right:false,
        onBlock:false,
    }
    self.spawnX = self.x;
    self.spawnY = self.y;
    self.spawnSpdX = self.spdX;
    self.spawnSpdY = self.spdY;
    self.spawnDoCollision = self.doCollision;
    self.moveSpeed = param.moveSpeed;
    self.jumpSpeed = param.jumpSpeed;
    self.level = param.level;
    self.isVisible = true;
    self.spawned = param.spawned;
    self.update = function(){
        self.lastX = self.x;
        self.lastY = self.y;
        if(cubie.x < self.x){
            if(random() < 0.7){
                self.keyPress.left = true;
                self.keyPress.right = false;
            }
            else{
                self.keyPress.left = false;
                self.keyPress.right = false;
            }
        }
        else if(cubie.x > self.x){
            if(random() < 0.7){
                self.keyPress.left = false;
                self.keyPress.right = true;
            }
            else{
                self.keyPress.left = false;
                self.keyPress.right = false;
            }
        }
        else{
            self.keyPress.left = false;
            self.keyPress.right = false;
        }
        if(cubie.y < self.y){
            if(random() < 0.7){
                self.keyPress.up = true;
                self.keyPress.down = false;
            }
            else{
                self.keyPress.up = false;
                self.keyPress.down = false;
            }
        }
        else{
            if(random() < 0.7){
                self.keyPress.up = false;
                self.keyPress.down = false;
            }
            else{
                self.keyPress.up = true;
                self.keyPress.down = false;
            }
        }
        if(levelCreator && self.level === 0 && !monsterGravity){
            self.keyPress.up = false;
            self.keyPress.down = false;
            self.keyPress.left = false;
            self.keyPress.right = false;
        }
        if(self.keyPress.up && self.keyPress.canJump){
            self.spdY -= sqrt(self.width / 30 * self.height / 30) * 9 * self.jumpSpeed;
            self.keyPress.canJump = false;
        }
        if(self.keyPress.down && !self.keyPress.onBlock){
            self.spdY += sqrt(self.width / 30 * self.height / 30) * 2 * self.jumpSpeed;
        }
        if(self.keyPress.left){
            self.spdX -= sqrt(self.width / 30 * self.height / 30) * self.moveSpeed;
        }
        if(self.keyPress.right){
            self.spdX += sqrt(self.width / 30 * self.height / 30) * self.moveSpeed;
        }
        if(!self.keyPress.onBlock && monsterGravity){
            self.spdY += sqrt(self.width / 30 * self.height / 30) * gravitySpd;
        }
        self.spdY *= 0.98;
        self.spdX *= 0.87;
        self.x += self.spdX;
        self.y += self.spdY;
        if(self.y < 0){
            self.y = 0;
            self.spdY = 0;
        }
        if(self.x > 600 - self.width){
            self.x = 600 - self.width;
            self.spdX = 0;
        }
        if(self.x < 0){
            self.x = 0;
            self.spdX = 0;
        }
        self.keyPress.onBlock = false;
        if(self.isColliding(cubie)){
            cubie.shade = {
                r:255,
                g:255,
                b:255,
                a:255,
            }
            cubie.x = cubie.spawnX;
            cubie.y = cubie.spawnY;
            cubie.lastX = cubie.spawnX;
            cubie.lastY = cubie.spawnY;
            cubie.deaths += 1;
            cubie.spdX = 0;
            cubie.spdY = 0;
            resetLevel();
        }
    }
    self.draw = function(){
        strokeWeight(1);
        fill(0, 125, 0);
        stroke(0, 0, 0);
        rect(self.x,self.y,self.width,self.height);
        fill(255, 255, 255);
        rect(self.x + self.width / 5,self.y + self.height / 5,self.width / 5,self.height / 5);
        rect(self.x + 3 * self.width / 5,self.y + self.height / 5,self.width / 5,self.height / 5);
        rect(self.x + self.width / 5,self.y + 3 * self.height / 5,3 * self.width / 5,self.height / 5);
        if(levelDebug){
            strokeWeight(3);
            stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
            fill(0, 0, 0, 0);
            rect(self.x,self.y,self.width,self.height);
        }
    }
    Monster.list[self.id] = self;
    return self;
}

Monster.list = [];

var Block = function(param){
    var self = Entity(param);
    self.blockType = param.blockType;
    self.doCollision = param.doCollision;
    self.level = param.level;
    if(self.blockType === 'sign'){
        self.text = 0;
        self.message = param.message;
    }
    if(self.blockType === 'portal'){
        self.traveled = 0;
    }
    if(self.blockType === 'sand'){
        self.falling = -1;
    }
    self.spawnX = self.x;
    self.spawnY = self.y;
    self.spawnSpdX = self.spdX;
    self.spawnSpdY = self.spdY;
    self.spawnDoCollision = self.doCollision;
    self.lastX = self.x;
    self.lastY = self.y;
    self.spawned = param.spawned;
    self.update = function(){
        self.lastX = self.x;
        self.lastY = self.y;
        var flipSpdX = false;
        var flipSpdY = false;
        var gravity = true;
        var x = cubie.x;
        var y = cubie.y;
        if(self.isColliding(cubie) && self.level === cubie.level){
            if(self.doCollision){
                cubie.x = cubie.lastX;
                if(self.isColliding(cubie)){
                    cubie.x = x;
                    cubie.y = cubie.lastY;
                    if(self.isColliding(cubie)){
                        cubie.x = cubie.lastX;
                        if(self.blockType === 'bounce'){
                            cubie.spdX = -cubie.spdX;
                        }
                        else{
                            cubie.spdX = 0;
                        }
                        if(cubie.spdY > 0){
                            cubie.keyPress.canJump = true;
                            cubie.keyPress.onBlock = true;
                        }
                        if(self.blockType === 'sticky'){
                            cubie.x += self.spdX;
                            if(cubieGravity && cubie.y <= self.y && self.spdY > 0){
                            }
                            else{
                                cubie.y += self.spdY;
                            }
                            if(cubie.x > 600 - cubie.width){
                                cubie.x = 600 - cubie.width;
                                flipSpdX = true;
                            }
                            if(cubie.x < 0){
                                cubie.x = 0;
                                flipSpdX = true;
                            }
                            if(cubie.y > 600 - cubie.height){
                                cubie.y = 600 - cubie.height;
                                flipSpdY = true;
                            }
                            if(cubie.y < 0){
                                cubie.y = 0;
                                flipSpdY = true;
                            }
                            if(cubie.spdY < 0){
                                cubie.keyPress.canJump = true;
                            }
                            for(var i in Block.list){
                                if(cubie.isColliding(Block.list[i]) && Block.list[i].level === cubie.level && Block.list[i].id !== self.id && Block.list[i].doCollision){
                                    flipSpdX = true;
                                    flipSpdY = true;
                                    cubie.x -= self.spdX;
                                    cubie.y -= self.spdY;
                                }
                            }
                            cubie.keyPress.onBlock = false;
                        }
                        if(self.blockType === 'bounce'){
                            cubie.spdY = -cubie.spdY * bounceSpd;
                        }
                        else{
                            cubie.spdY = 0;
                        }
                    }
                    else{
                        if(cubie.spdY >= 0){
                            cubie.keyPress.canJump = true;
                            cubie.keyPress.onBlock = true;
                        }
                        if(self.blockType === 'sticky'){
                            cubie.x += self.spdX;
                            if(cubieGravity && cubie.y <= self.y && self.spdY > 0){
                            }
                            else{
                                cubie.y += self.spdY;
                            }
                            if(cubie.x > 600 - cubie.width){
                                cubie.x = 600 - cubie.width;
                                flipSpdX = true;
                            }
                            if(cubie.x < 0){
                                cubie.x = 0;
                                flipSpdX = true;
                            }
                            if(cubie.y > 600 - cubie.height){
                                cubie.y = 600 - cubie.height;
                                flipSpdY = true;
                            }
                            if(cubie.y < 0){
                                cubie.y = 0;
                                flipSpdY = true;
                            }
                            if(cubie.spdY < 0){
                                cubie.keyPress.canJump = true;
                            }
                            for(var i in Block.list){
                                if(cubie.isColliding(Block.list[i]) && Block.list[i].level === cubie.level && Block.list[i].id !== self.id && Block.list[i].doCollision){
                                    flipSpdX = true;
                                    flipSpdY = true;
                                    cubie.x -= self.spdX;
                                    cubie.y -= self.spdY;
                                }
                            }
                            cubie.keyPress.onBlock = false;
                        }
                        if(self.blockType === 'bounce'){
                            cubie.spdY = -cubie.spdY * bounceSpd;
                        }
                        else if(self.blockType === 'ice'){
                            cubie.spdY = 0;
                            cubie.spdX = cubie.spdX * 1.2;
                        }
                        else if(self.blockType === 'mud'){
                            cubie.spdY = 0;
                            cubie.spdX = cubie.spdX * 0.1;
                        }
                        else{
                            cubie.spdY = 0;
                            cubie.spdX = cubie.spdX * 0.97;
                        }
                    }
                }
                else{
                    if(self.blockType === 'bounce'){
                        cubie.spdX = -cubie.spdX * bounceSpd;
                    }
                    else{
                        cubie.spdX = 0;
                    }
                    if(self.blockType === 'sticky'){
                        cubie.x += self.spdX;
                        if(cubieGravity && cubie.y <= self.y && self.spdY > 0){
                        }
                        else{
                            cubie.y += self.spdY;
                        }
                        if(cubie.x > 600 - cubie.width){
                            cubie.x = 600 - cubie.width;
                            flipSpdX = true;
                        }
                        if(cubie.x < 0){
                            cubie.x = 0;
                            flipSpdX = true;
                        }
                        if(cubie.y > 600 - cubie.height){
                            cubie.y = 600 - cubie.height;
                            flipSpdY = true;
                        }
                        if(cubie.y < 0){
                            cubie.y = 0;
                            flipSpdY = true;
                        }
                        for(var i in Block.list){
                            if(cubie.isColliding(Block.list[i]) && Block.list[i].level === cubie.level && Block.list[i].id !== self.id && Block.list[i].doCollision){
                                flipSpdX = true;
                                flipSpdY = true;
                                cubie.x -= self.spdX;
                                cubie.y -= self.spdY;
                            }
                        }
                        cubie.keyPress.onBlock = false;
                    }
                }
            }
            if(self.blockType === 'sign'){
                drawText = true;
                self.text += 1;
                textToDraw = self.message.substring(0,self.text);
            }
            if(self.blockType === 'portal'){
                self.traveled += 10;
                cubie.shade = {
                    r:125,
                    g:125,
                    b:255,
                    a:self.traveled,
                }
                if(self.traveled === 300){
                    cubie.shade = {
                        r:225,
                        g:225,
                        b:255,
                        a:self.traveled,
                    }
                    cubie.level += 1;
                    fill(0,225,255);
                    rect(0,0,600,600);
                    if(cubie.level === spawnPositions.length){
                        cubie.level = 1;
                        println('You won with time ' + round(time * 100 / 6) + '.\nYou had ' + cubie.deaths + ' deaths.\nThis speedrun is in version ' + version + '.\nYou used your mouse power ' + powerUsed + ' times.');
                        time = -1;
                        powerUsed = 0;
                    }
                    cubie.spawnX = spawnPositions[cubie.level][0];
                    cubie.spawnY = spawnPositions[cubie.level][1];
                    cubie.x = cubie.spawnX;
                    cubie.y = cubie.spawnY;
                    cubie.lastX = cubie.spawnX;
                    cubie.lastY = cubie.spawnY;
                }
            }
            if(self.blockType === 'lava'){
                cubie.shade = {
                    r:255,
                    g:255,
                    b:255,
                    a:255,
                }
                cubie.x = cubie.spawnX;
                cubie.y = cubie.spawnY;
                cubie.lastX = cubie.spawnX;
                cubie.lastY = cubie.spawnY;
                cubie.deaths += 1;
                cubie.spdX = 0;
                cubie.spdY = 0;
                resetLevel();
            }
            if(self.blockType === 'water'){
                cubie.spdX *= 0.05;
                cubie.spdY *= 0.05;
                cubie.keyPress.canJump = true;
                cubie.keyPress.onBlock = false;
            }
            if(self.blockType === 'sand'){
                self.doCollision = false;
                self.falling = 100;
            }
        }
        else{
            if(self.blockType === 'sign'){
                self.text = 0;
            }
            if(self.blockType === 'portal'){
                self.traveled = 0;
            }
        }
        for(var i in Monster.list){
            if(self.isColliding(Monster.list[i]) && self.level === Monster.list[i].level){
                var monster = Monster.list[i];
                if(self.doCollision){
                    var x = monster.x;
                    var y = monster.y;
                    monster.x = monster.lastX;
                    if(self.isColliding(monster)){
                        monster.x = x;
                        monster.y = monster.lastY;
                        if(self.isColliding(monster)){
                            monster.x = monster.lastX;
                            if(self.blockType === 'bounce'){
                                monster.spdX = -monster.spdX;
                            }
                            else{
                                monster.spdX = 0;
                            }
                            if(monster.spdY > 0){
                                monster.keyPress.canJump = true;
                                monster.keyPress.onBlock = true;
                            }
                            if(self.blockType === 'sticky'){
                                monster.x += self.spdX;
                                if(monsterGravity && monster.y <= self.y && self.spdY > 0){
                                }
                                else{
                                    monster.y += self.spdY;
                                }
                                if(monster.x > 600 - monster.width){
                                    monster.x = 600 - monster.width;
                                    flipSpdX = true;
                                }
                                if(monster.x < 0){
                                    monster.x = 0;
                                    flipSpdX = true;
                                }
                                if(monster.y > 600 - monster.height){
                                    monster.y = 600 - monster.height;
                                    flipSpdY = true;
                                }
                                if(monster.y < 0){
                                    monster.y = 0;
                                    flipSpdY = true;
                                }
                                if(monster.spdY < 0){
                                    monster.keyPress.canJump = true;
                                }
                                for(var i in Block.list){
                                    if(monster.isColliding(Block.list[i]) && Block.list[i].level === monster.level && Block.list[i].id !== self.id && Block.list[i].doCollision){
                                        flipSpdX = true;
                                        flipSpdY = true;
                                        monster.x -= self.spdX;
                                        monster.y -= self.spdY;
                                    }
                                }
                                monster.keyPress.onBlock = false;
                            }
                            if(self.blockType === 'bounce'){
                                monster.spdY = -monster.spdY * bounceSpd;
                            }
                            else{
                                monster.spdY = 0;
                            }
                        }
                        else{
                            if(monster.spdY >= 0){
                                monster.keyPress.canJump = true;
                                monster.keyPress.onBlock = true;
                            }
                            if(self.blockType === 'sticky'){
                                monster.x += self.spdX;
                                if(monsterGravity && monster.y <= self.y && self.spdY > 0){
                                }
                                else{
                                    monster.y += self.spdY;
                                }
                                if(monster.x > 600 - monster.width){
                                    monster.x = 600 - monster.width;
                                    flipSpdX = true;
                                }
                                if(monster.x < 0){
                                    monster.x = 0;
                                    flipSpdX = true;
                                }
                                if(monster.y > 600 - monster.height){
                                    monster.y = 600 - monster.height;
                                    flipSpdY = true;
                                }
                                if(monster.y < 0){
                                    monster.y = 0;
                                    flipSpdY = true;
                                }
                                if(monster.spdY < 0){
                                    monster.keyPress.canJump = true;
                                }
                                for(var i in Block.list){
                                    if(monster.isColliding(Block.list[i]) && Block.list[i].level === monster.level && Block.list[i].id !== self.id && Block.list[i].doCollision){
                                        flipSpdX = true;
                                        flipSpdY = true;
                                        monster.x -= self.spdX;
                                        monster.y -= self.spdY;
                                    }
                                }
                                monster.keyPress.onBlock = false;
                            }
                            if(self.blockType === 'bounce'){
                                monster.spdY = -monster.spdY * bounceSpd;
                            }
                            else if(self.blockType === 'ice'){
                                monster.spdY = 0;
                                monster.spdX = monster.spdX * 1.2;
                            }
                            else if(self.blockType === 'mud'){
                                monster.spdY = 0;
                                monster.spdX = monster.spdX * 0.1;
                            }
                            else{
                                monster.spdY = 0;
                                monster.spdX = monster.spdX * 0.97;
                            }
                        }
                    }
                    else{
                        if(self.blockType === 'bounce'){
                            monster.spdX = -monster.spdX * bounceSpd;
                        }
                        else{
                            monster.spdX = 0;
                        }
                        if(self.blockType === 'sticky'){
                            monster.x += self.spdX;
                            if(monsterGravity && monster.y <= self.y && self.spdY > 0){
                            }
                            else{
                                monster.y += self.spdY;
                            }
                            if(monster.x > 600 - monster.width){
                                monster.x = 600 - monster.width;
                                flipSpdX = true;
                            }
                            if(monster.x < 0){
                                monster.x = 0;
                                flipSpdX = true;
                            }
                            if(monster.y > 600 - monster.height){
                                monster.y = 600 - monster.height;
                                flipSpdY = true;
                            }
                            if(monster.y < 0){
                                monster.y = 0;
                                flipSpdY = true;
                            }
                            for(var i in Block.list){
                                if(monster.isColliding(Block.list[i]) && Block.list[i].level === monster.level && Block.list[i].id !== self.id && Block.list[i].doCollision){
                                    flipSpdX = true;
                                    flipSpdY = true;
                                    monster.x -= self.spdX;
                                    monster.y -= self.spdY;
                                }
                            }
                            monster.keyPress.onBlock = false;
                        }
                    }
                }
                if(self.blockType === 'lava'){
                    monster.isVisible = false;
                }
                if(self.blockType === 'water'){
                    monster.spdX *= 0.05;
                    monster.spdY *= 0.05;
                    monster.keyPress.canJump = true;
                    monster.keyPress.onBlock = false;
                }
                if(self.blockType === 'sand'){
                    self.doCollision = false;
                    self.falling = 100;
                }
            }
        }
        for(var i in Block.list){
            if(self.isColliding(Block.list[i]) && Block.list[i].level === self.level && Block.list[i].id !== self.id){
                if(Block.list[i].doCollision || Block.list[i].blockType === 'blocker' && self.blockType !== 'sand'){
                    flipSpdX = true;
                    flipSpdY = true;
                    if(self.blockType !== 'blocker' && blockGravity){
                        gravity = false;
                    }
                }
            }
        }
        if(self.y > 600 - self.height && self.blockType !== 'sand'){
            self.y = 600 - self.height;
            flipSpdY = true;
        }
        if(self.y < 0){
            self.y = 0;
            flipSpdY = true;
        }
        if(self.x > 600 - self.width){
            self.x = 600 - self.width;
            flipSpdX = true;
        }
        if(self.x < 0){
            self.x = 0;
            flipSpdX = true;
        }
        if(flipSpdX){
            self.spdX = -self.spdX * bounceSpd;
        }
        if(flipSpdY){
            self.spdY = -self.spdY * bounceSpd;
        }
        if(self.blockType !== 'blocker' && blockGravity && gravity){
            self.spdY += gravitySpd;
        }
        else if(self.blockType === 'sand'){
            if(self.falling === 0){
                //self.toRemove = true;
            }
            else if(self.falling === -1){
                
            }
            else{
                self.falling -= 1;
                if(flipSpdY){
                    self.spdY = -self.spdY * bounceSpd;
                }
                self.spdY += gravitySpd;
            }
        }
        self.x += self.spdX;
        self.y += self.spdY;
        self.draw();
    }
    self.draw = function(){
        switch(self.blockType){
            case 'sticky':
                noStroke();
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                }
                fill(125, 255, 0);
                rect(self.x,self.y,self.width,self.height);
                break;
            case 'sign':
                strokeWeight(1);
                stroke(100, 50, 0);
                fill(155, 100, 0);
                rect(self.x + self.width * 2 / 5,self.y + self.height / 2,self.width / 5,self.height / 2);
                rect(self.x,self.y,self.width,self.height * 2 / 3);
                fill(100,50,0);
                noStroke();
                rect(self.x + self.width / 10,self.y + self.height / 10,self.width * 3 / 10,self.height / 10);
                rect(self.x + self.width * 5 / 10,self.y + self.height / 10,self.width * 4 / 10,self.height / 10);
                rect(self.x + self.width / 10,self.y + self.height  * 3 / 10,self.width * 8 / 10,self.height / 10);
                rect(self.x + self.width / 10,self.y + self.height  * 5 / 10,self.width * 5 / 10,self.height / 10);
                rect(self.x + self.width * 7 / 10,self.y + self.height  * 5 / 10,self.width * 2 / 10,self.height / 10);
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                    fill(0, 0, 0, 0);
                    rect(self.x,self.y,self.width,self.height);
                }
                break;
            case 'portal':
                noStroke();
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                }
                fill(125, 125, 255);
                rect(self.x,self.y,self.width,self.height);
                break;
            case 'lava':
                noStroke();
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                }
                fill(255, 55, 0);
                rect(self.x,self.y,self.width,self.height);
                break;
            case 'color':
                noStroke();
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                }
                fill(param.color);
                rect(self.x,self.y,self.width,self.height);
                break;
            case 'bounce':
                noStroke();
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                }
                fill(0,255,125);
                rect(self.x,self.y,self.width,self.height);
                break;
            case 'ice':
                noStroke();
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                }
                fill(125, 175, 225);
                rect(self.x,self.y,self.width,self.height);
                break;
            case 'mud':
                noStroke();
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                }
                fill(125, 105, 55);
                rect(self.x,self.y,self.width,self.height);
                break;
            case 'blocker':
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                    fill(75,75,75,75);
                    rect(self.x,self.y,self.width,self.height);
                }
                break;
            case 'cubie':
                strokeWeight(1);
                fill(255, 0, 0);
                stroke(0, 0, 0);
                rect(self.x,self.y,self.width,self.height);
                fill(0, 0, 0);
                rect(self.x + self.width / 5,self.y + self.height / 5,self.width / 5,self.height / 5);
                rect(self.x + 3 * self.width / 5,self.y + self.height / 5,self.width / 5,self.height / 5);
                rect(self.x + self.width / 5,self.y + 3 * self.height / 5,3 * self.width / 5,self.height / 5);
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                    fill(0, 0, 0, 0);
                    rect(self.x,self.y,self.width,self.height);
                }
                break;
            case 'water':
                noStroke();
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                }
                fill(0, 125, 255);
                rect(self.x,self.y,self.width,self.height);
                break;
            case 'sand':
                noStroke();
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                }
                fill(255, 255, 125);
                rect(self.x,self.y,self.width,self.height);
                break;
            default:
                noStroke();
                if(levelDebug){
                    strokeWeight(3);
                    stroke(hitboxColor[0],hitboxColor[1],hitboxColor[2]);
                }
                fill(0, 255, 0);
                rect(self.x,self.y,self.width,self.height);
                break;
        }
    }
    Block.list[self.id] = self;
    return self;
}

Block.list = [];

cubie.x = spawnPositions[level][0];
cubie.y = spawnPositions[level][1];
cubie.spawnX = spawnPositions[level][0];
cubie.spawnY = spawnPositions[level][1];
cubie.level = level;

var resetLevel = function(){
    for(var i in Block.list){
        Block.list[i].x = Block.list[i].spawnX;
        Block.list[i].y = Block.list[i].spawnY;
        Block.list[i].spdX = Block.list[i].spawnSpdX;
        Block.list[i].spdY = Block.list[i].spawnSpdY;
        Block.list[i].doCollision = Block.list[i].spawnDoCollision;
        if(Block.list[i].blockType === 'sign'){
            Block.list[i].text = 0;
        }
        if(Block.list[i].blockType === 'portal'){
            Block.list[i].traveled = 0;
        }
        if(Block.list[i].blockType === 'sand'){
            Block.list[i].falling = -1;
        }
    }
    for(var i in Monster.list){
        Monster.list[i].x = Monster.list[i].spawnX;
        Monster.list[i].y = Monster.list[i].spawnY;
        Monster.list[i].spdX = Monster.list[i].spawnSpdX;
        Monster.list[i].spdY = Monster.list[i].spawnSpdY;
        Monster.list[i].doCollision = Monster.list[i].spawnDoCollision;
        Monster.list[i].isVisible = true;
    }
}

//Levels
{
    //Level 1
    {
        level = 1;
        new Block({
            x:0,
            y:570,
            width:600,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'Move with the ARROW\n keys.',
        });
        new Block({
            x:420,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'Get to the portal to win.',
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 2
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:600,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'Go do some parkour.',
        });
        new Block({
            x:150,
            y:510,
            width:30,
            height:60,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:240,
            y:480,
            width:30,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:450,
            width:30,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:420,
            width:30,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:510,
            y:420,
            width:30,
            height:150,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 3
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:180,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:510,
            width:30,
            height:60,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'There can be sticky\nmoving blocks.',
        });
        new Block({
            x:510,
            y:450,
            spdX:1,
            width:90,
            height:30,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:570,
            width:120,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:510,
            width:30,
            height:60,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 4
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:600,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:240,
            width:270,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:270,
            y:240,
            spdY:1,
            width:60,
            height:30,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:270,
            y:210,
            width:60,
            height:30,
            blockType:'blocker',
            doCollision:false,
            level:level,
        });
        new Block({
            x:330,
            y:240,
            width:270,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:210,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'Take the elevator down!',
        });
        new Block({
            x:0,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 5
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:120,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:570,
            width:120,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:90,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'Sometimes, winning can\nget tricky.',
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
        new Block({
            x:0,
            y:480,
            width:480,
            height:5,
            blockType:'sticky',
            doCollision:true,
            level:5,
        });
        new Block({
            x:480,
            y:480,
            width:5,
            height:55,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:535,
            width:5,
            height:35,
            blockType:'none',
            doCollision:false,
            level:level,
        });
    }
    //Level 6
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:300,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:570,
            width:240,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'Lava is dangerous. Don\'t\ntouch it!',
        });
        new Block({
            x:300,
            y:570,
            width:60,
            height:30,
            blockType:'lava',
            doCollision:false,
            level:level,
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 7
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:600,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'Wait, lava can move???',
        });
        new Block({
            x:150,
            y:530,
            width:30,
            height:40,
            blockType:'lava',
            doCollision:false,
            level:level,
        });
        new Block({
            x:300,
            y:480,
            width:60,
            height:90,
            spdY:-10,
            blockType:'lava',
            doCollision:false,
            level:level,
        });
        new Block({
            x:370,
            y:0,
            width:60,
            height:90,
            spdY:10,
            blockType:'lava',
            doCollision:false,
            level:level,
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 8
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:600,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'These blocks are super\nbouncy. I wonder what\nto do with them...',
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:300,
            width:570,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:0,
            width:30,
            height:30,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:270,
            width:30,
            height:30,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:30,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 9
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:150,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:570,
            width:150,
            height:30,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:390,
            y:540,
            width:60,
            height:30,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:480,
            width:30,
            height:60,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:570,
            width:60,
            height:30,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'This ice is super\nslippery! Make sure not\nto fall off!',
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 10
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:570,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:570,
            width:30,
            height:30,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:480,
            width:540,
            height:30,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:465,
            width:25,
            height:15,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:420,
            width:30,
            height:20,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:135,
            y:460,
            width:30,
            height:20,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:420,
            width:30,
            height:20,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:285,
            y:460,
            width:30,
            height:20,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:370,
            y:420,
            width:30,
            height:20,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:135,
            y:370,
            width:30,
            height:20,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:330,
            width:30,
            height:20,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:285,
            y:370,
            width:30,
            height:20,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:370,
            y:330,
            width:30,
            height:20,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:330,
            width:15,
            height:135,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:390,
            width:540,
            height:30,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:300,
            width:540,
            height:30,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:375,
            width:60,
            height:15,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:510,
            y:60,
            width:30,
            height:240,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:300,
            y:60,
            spdX:2,
            width:90,
            height:30,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:270,
            y:60,
            width:30,
            height:90,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:200,
            y:0,
            width:30,
            height:220,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:230,
            y:190,
            width:190,
            height:30,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:300,
            y:120,
            width:210,
            height:30,
            blockType:'lava',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:285,
            width:510,
            height:15,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:60,
            width:15,
            height:225,
            blockType:'lava',
            doCollision:true,
            level:level,
        });
        new Block({
            x:185,
            y:0,
            width:15,
            height:220,
            blockType:'lava',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:30,
            width:60,
            height:30,
            blockType:'ice',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'Wait, bouncy blocks,\nlava, and ice???',
        });
        new Block({
            x:0,
            y:0,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 11
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:150,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:570,
            width:150,
            height:30,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:570,
            width:150,
            height:30,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'Mud makes you VERY\nslow when you\nwalk on it.',
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 12
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:600,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:360,
            width:60,
            height:210,
            blockType:'water',
            doCollision:false,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            message:'If only there was a way\nto get up there... Water\nmight help you with that.',
            doCollision:false,
            level:level,
        });
        new Block({
            x:420,
            y:360,
            width:120,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:360,
            width:120,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:360,
            width:120,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:150,
            width:60,
            height:210,
            blockType:'water',
            doCollision:false,
            level:level,
        });
        new Block({
            x:60,
            y:150,
            width:120,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:270,
            y:150,
            width:120,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:150,
            width:120,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:120,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
        }
    //Level 13
    {
        level += 1;
        new Block({
            x:0,
            y:120,
            width:90,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:90,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:120,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:180,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:240,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:270,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:300,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:390,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:120,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:510,
            y:120,
            width:30,
            height:300,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:150,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:150,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:210,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:210,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:270,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:270,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:330,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:330,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:390,
            width:60,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
        new Block({
            x:510,
            y:420,
            width:90,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:90,
            width:30,
            height:30,
            blockType:'sign',
            message:'Whoa! No floor! But the\nsand path ahead\ndoesn\'t look stable...',
            doCollision:false,
            level:level,
        });
    }
    //Level 14
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:180,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:180,
            y:570,
            width:60,
            height:30,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:240,
            y:570,
            width:210,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:570,
            width:60,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:570,
            width:90,
            height:30,
            blockType:'lava',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:480,
            width:180,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:450,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            message:'Uh oh! Monsters! Try\nto lure them into\nthat lava over there.',
            doCollision:false,
            level:level,
        });
        new Monster({
            x:60,
            y:450,
            width:30,
            height:30,
            moveSpeed:0.2,
            jumpSpeed:0.7,
            level:level,
        });
        new Monster({
            x:120,
            y:450,
            width:30,
            height:30,
            moveSpeed:0.2,
            jumpSpeed:0.7,
            level:level,
        });
    }
    //Level 15
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:600,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'This is the end of the\ntutorial.',
        });
        new Block({
            x:420,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'Go in the portal to\ncontinue to the\nuser-submitted levels.',
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 16
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:210,
            height:30,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:570,
            width:240,
            height:30,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:180,
            y:510,
            width:30,
            height:60,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:510,
            width:30,
            height:60,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:510,
            spdX:4,
            width:30,
            height:15,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:180,
            y:450,
            width:210,
            height:15,
            blockType:'lava',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:420,
            width:570,
            height:30,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:30,
            y:360,
            width:570,
            height:15,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:270,
            width:570,
            height:30,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:30,
            y:210,
            width:570,
            height:15,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:120,
            width:570,
            height:30,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:30,
            y:60,
            width:570,
            height:15,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'The TIANMU unspeedrun!\n\nby the-real-tianmu',
        });
        new Block({
            x:180,
            y:480,
            width:30,
            height:30,
            blockType:'sign',
            doCollision:false,
            level:level,
            message:'This map is the best for a\nspeedrun. Please only use\nthis map for speedruns.',
        });
        new Block({
            x:0,
            y:0,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
    }
    //Level 17
    {
        level += 1;
        new Block({
            x:0,
            y:570,
            width:600,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:510,
            y:540,
            width:90,
            height:60,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:330,
            width:90,
            height:60,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:330,
            width:90,
            height:60,
            blockType:'bounce',
            doCollision:true,
            level:level,
        });
        new Block({
            x:120,
            y:210,
            width:270,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:240,
            width:210,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:180,
            y:210,
            width:150,
            height:90,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:240,
            y:30,
            width:30,
            height:180,
            blockType:'sign',
            message:'Cool tree!',
            doCollision:false,
            level:level,
        });
        new Block({
            x:180,
            y:90,
            width:150,
            height:60,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:30,
            width:90,
            height:120,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:180,
            y:30,
            width:150,
            height:180,
            blockType:'blocker',
            doCollision:false,
            level:level,
        });
        new Block({
            x:150,
            y:180,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
        new Block({
            x:60,
            y:540,
            width:30,
            height:30,
            blockType:'sign',
            message:'Skyblock\n\nby sp',
            doCollision:false,
            level:level,
        });
    }
    //Level 18
    {
        level += 1;
        new Block({
            x:450,
            y:390,
            width:30,
            height:30,
            blockType:'sign',
            message:'Remote Island\n\nby sp',
            doCollision:false,
            level:level,
        });
        new Block({
            x:570,
            y:570,
            width:30,
            height:30,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
        new Block({
            x:0,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:30,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:90,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:120,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:180,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:240,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:270,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:300,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:390,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:510,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:480,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:570,
            y:450,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:450,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:480,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:510,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:510,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:510,
            y:480,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:510,
            y:450,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:450,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:480,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:480,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:450,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:450,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:480,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:390,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:390,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:390,
            y:480,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:390,
            y:450,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:450,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:480,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:480,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:300,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:300,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:270,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:240,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:300,
            y:480,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:450,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:420,
            width:150,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:540,
            y:390,
            width:60,
            height:30,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:510,
            y:330,
            width:30,
            height:90,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:270,
            width:150,
            height:60,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:240,
            width:90,
            height:90,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:450,
            width:330,
            height:30,
            blockType:'water',
            doCollision:false,
            level:level,
        });
        new Block({
            x:0,
            y:480,
            width:300,
            height:60,
            blockType:'water',
            doCollision:false,
            level:level,
        });
        new Block({
            x:0,
            y:540,
            width:240,
            height:30,
            blockType:'water',
            doCollision:false,
            level:level,
        });
    }
    //Level 19
    {
        level += 1;
        new Block({
            x:210,
            y:570,
            width:180,
            height:30,
            blockType:'mud',
            doCollision:true,
            level:level,
        });
        new Block({
            x:0,
            y:570,
            width:120,
            height:30,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:480,
            y:570,
            width:120,
            height:30,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:120,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:180,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:390,
            y:570,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:570,
            width:180,
            height:30,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:570,
            width:180,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:540,
            width:30,
            height:30,
            blockType:'portal',
            doCollision:false,
            level:level,
        });
        new Block({
            x:60,
            y:510,
            width:30,
            height:60,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:120,
            y:450,
            width:30,
            height:30,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:120,
            y:480,
            width:30,
            height:90,
            blockType:'lava',
            doCollision:true,
            level:level,
        });
        new Block({
            x:120,
            y:330,
            width:30,
            height:60,
            blockType:'lava',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:300,
            width:30,
            height:30,
            blockType:'lava',
            doCollision:true,
            level:level,
        });
        new Block({
            x:120,
            y:480,
            width:30,
            height:90,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:120,
            y:330,
            width:30,
            height:60,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:300,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:450,
            y:330,
            width:30,
            height:240,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:300,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:390,
            y:330,
            width:30,
            height:240,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:330,
            width:30,
            height:60,
            blockType:'lava',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:330,
            width:30,
            height:60,
            blockType:'lava',
            doCollision:true,
            level:level,
        });
        new Block({
            x:420,
            y:390,
            width:30,
            height:180,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:180,
            y:330,
            width:30,
            height:60,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:510,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:150,
            y:540,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:180,
            y:390,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:360,
            width:180,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:240,
            y:330,
            width:120,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:270,
            y:300,
            width:60,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:450,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:420,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:420,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:360,
            y:390,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:390,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:300,
            y:390,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:270,
            y:390,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:240,
            y:390,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:210,
            y:390,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:240,
            y:420,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:270,
            y:420,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:300,
            y:420,
            width:30,
            height:30,
            blockType:'sand',
            doCollision:true,
            level:level,
        });
        new Block({
            x:60,
            y:480,
            width:30,
            height:30,
            blockType:'sign',
            message:'Ruined Desert Temple\n\nby the-real-tianmu',
            doCollision:false,
            level:level,
        });
        new Block({
            x:240,
            y:60,
            spdX:2,
            width:120,
            height:30,
            blockType:'sticky',
            doCollision:true,
            level:level,
        });
        new Block({
            x:330,
            y:0,
            width:30,
            height:60,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Block({
            x:240,
            y:0,
            width:30,
            height:60,
            blockType:'none',
            doCollision:true,
            level:level,
        });
        new Monster({
            x:270,
            y:30,
            width:30,
            height:30,
            moveSpeed:0.2,
            jumpSpeed:0.7,
            level:level,
        });
        new Monster({
            x:300,
            y:0,
            width:30,
            height:30,
            moveSpeed:0.2,
            jumpSpeed:0.7,
            level:level,
        });
    }
}

document.onkeydown = function(event){
    if(document.getElementById("pageDiv").style.display !== 'none'){
        return;
    }
    if(time === -1){
        time = 0;
    }
    key = event.key;
    if(key === 'ArrowUp'){
        cubie.keyPress.up = true;
    }
    if(key === 'ArrowDown'){
        cubie.keyPress.down = true;
    }
    if(key === 'ArrowLeft'){
        cubie.keyPress.left = true;
    }
    if(key === 'ArrowRight'){
        cubie.keyPress.right = true;
    }
    if(key === 'w'){
        cubie.keyPress.up = true;
    }
    if(key === 's'){
        cubie.keyPress.down = true;
    }
    if(key === 'a'){
        cubie.keyPress.left = true;
    }
    if(key === 'd'){
        cubie.keyPress.right = true;
    }
    if(key === 'b'){
        var logs = '';
        for(var i in Block.list){
            if(Block.list[i].level === cubie.level && Block.list[i].spawned){
                if(Block.list[i].blockType === false){
                    logs += 'new Block({<br>&#09;x:' + Block.list[i].x + ',<br>&#09;y:' + Block.list[i].y + ',<br>&#09;width:' + Block.list[i].width + ',<br>&#09;height:' + Block.list[i].height + ',<br>&#09;blockType:' + Block.list[i].blockType + ',<br>&#09;doCollision:' + Block.list[i].doCollision + ',<br>&#09;level:level,<br>});<br>';
                }
                else if(Block.list[i].blockType === 'sign'){
                    var message = Block.list[i].message.replace(/(?:\n)/g, '\\n');
                    logs += 'new Block({<br>&#09;x:' + Block.list[i].x + ',<br>&#09;y:' + Block.list[i].y + ',<br>&#09;width:' + Block.list[i].width + ',<br>&#09;height:' + Block.list[i].height + ',<br>&#09;blockType:\'' + Block.list[i].blockType + '\',<br>&#09;message:\'' + message + '\',<br>&#09;doCollision:' + Block.list[i].doCollision + ',<br>&#09;level:level,<br>});<br>';
                }
                else{
                    logs += 'new Block({<br>&#09;x:' + Block.list[i].x + ',<br>&#09;y:' + Block.list[i].y + ',<br>&#09;width:' + Block.list[i].width + ',<br>&#09;height:' + Block.list[i].height + ',<br>&#09;blockType:\'' + Block.list[i].blockType + '\',<br>&#09;doCollision:' + Block.list[i].doCollision + ',<br>&#09;level:level,<br>});<br>';
                }
            }
        }
        for(var i in Monster.list){
            if(Monster.list[i].level === cubie.level && Monster.list[i].spawned){
                logs += 'new Monster({<br>&#09;x:' + Monster.list[i].x + ',<br>&#09;y:' + Monster.list[i].y + ',<br>&#09;width:' + Monster.list[i].width + ',<br>&#09;height:' + Monster.list[i].height + ',<br>&#09;moveSpeed:' + Monster.list[i].moveSpeed + ',<br>&#09;jumpSpeed:' + Monster.list[i].jumpSpeed + ',<br>&#09;level:level,<br>});<br>';
            }
        }
        var scroll = false;
        if(gameMessages.scrollTop + gameMessages.clientHeight >= gameMessages.scrollHeight - 5){
            scroll = true;
        }
        gameMessages.innerHTML += '<div class="UI-text-light gameMessage" ' + gameMessageStyle + '>' + logs + '</div>'
        if(scroll){
            gameMessages.scrollTop = gameMessages.scrollHeight;
        }
    }
    if(key === 'c'){
        cubieGravity = false;
        blockGravity = false;
        levelDebug = true;
        levelCreator = true;
        cubie.level = 0;
    }
    if(key === '1'){
        mousePower = 'none';
    }
    if(key === '2'){
        mousePower = 'sticky';
    }
    if(key === '3'){
        mousePower = 'portal';
    }
    if(key === '4'){
        mousePower = 'lava';
    }
    if(key === '5'){
        mousePower = 'ice';
    }
    if(key === '6'){
        mousePower = 'bounce';
    }
    if(key === '7'){
        mousePower = 'mud';
    }
    if(key === '8'){
        mousePower = 'sign';
    }
    if(key === '9'){
        mousePower = 'blocker';
    }
    if(key === '0'){
        mousePower = 'cubie';
    }
    if(key === '-'){
        mousePower = 'water';
    }
    if(key === '='){
        mousePower = 'sand';
    }
    if(key === '['){
        mousePower = 'looseSand';
    }
    if(key === ']'){
        mousePower = 'monster';
    }
    if(key === '\\'){
        mousePower = 'spawn';
    }
    if(key === 'v'){
        for(var i in Block.list){
            if(Block.list[i].level === cubie.level && Block.list[i].spawned){
                delete Block.list[i];
            }
        }
        for(var i in Monster.list){
            if(Monster.list[i].level === cubie.level && Monster.list[i].spawned){
                delete Monster.list[i];
            }
        }
    }
    if(key === 'g'){
        cubieGravity = !cubieGravity;
    }
    if(key === 'h'){
        blockGravity = !blockGravity;
    }
    if(key === 'j'){
        monsterGravity = !monsterGravity;
    }
    if(key === 'p'){
        paused = !paused;
    }
    if(key === 'x'){
        levelDebug = !levelDebug;
    }
    if(key === 'z'){
        if(lastBlock.length !== 0){
            if(lastBlock[0][1] === 'block'){
                delete Block.list[lastBlock[0][0]];
            }
            if(lastBlock[0][1] === 'monster'){
                delete Monster.list[lastBlock[0][0]];
            }
            lastBlock.shift();
        }
    }
}
document.onkeyup = function(event){
    if(document.getElementById("pageDiv").style.display !== 'none'){
        return;
    }
    key = event.key;
    if(key === 'ArrowUp'){
        cubie.keyPress.up = false;
    }
    if(key === 'ArrowDown'){
        cubie.keyPress.down = false;
    }
    if(key === 'ArrowLeft'){
        cubie.keyPress.left = false;
    }
    if(key === 'ArrowRight'){
        cubie.keyPress.right = false;
    }
    if(key === 'w'){
        cubie.keyPress.up = false;
    }
    if(key === 's'){
        cubie.keyPress.down = false;
    }
    if(key === 'a'){
        cubie.keyPress.left = false;
    }
    if(key === 'd'){
        cubie.keyPress.right = false;
    }
}
onmousedown = function(event){
    if(document.getElementById("pageDiv").style.display !== 'none'){
        return;
    }
    if(!mouseIn){
        return;
    }
    isClicking = true;
    if(paused){
        return;
    }
    if(levelCreator){
        levelMouseStartX = mouseX;
        levelMouseStartY = mouseY;
    }
}
onmouseup = function(event){
    if(document.getElementById("pageDiv").style.display !== 'none'){
        return;
    }
    if(!mouseIn){
        return;
    }
    isClicking = false;
    if(paused){
        return;
    }
    if(levelCreator){
        var x = min(floor(levelMouseStartX / gridSize) * gridSize,floor(mouseX / gridSize) * gridSize);
        var y = min(floor(levelMouseStartY / gridSize) * gridSize,floor(mouseY / gridSize) * gridSize);
        var width = max(ceil(levelMouseStartX / gridSize) * gridSize,ceil(mouseX / gridSize) * gridSize) - min(floor(levelMouseStartX / gridSize) * gridSize,floor(mouseX / gridSize) * gridSize);
        var height = max(ceil(levelMouseStartY / gridSize) * gridSize,ceil(mouseY / gridSize) * gridSize) - min(floor(levelMouseStartY / gridSize) * gridSize,floor(mouseY / gridSize) * gridSize);
        switch(mousePower){
            case 'color':
                var block = Block({
                    x:x,
                    y:y,
                    width:width,
                    height:height,
                    blockType:'color',
                    color:color(random(0,255),random(0,255),random(0,255)),
                    doCollision:false,
                    level:cubie.level,
                    spawned:true,
                });
                lastBlock.splice(0,0,[block.id,'block']);
                powerUsed += 1;
                break;
            case 'water':
                var block = Block({
                    x:x,
                    y:y,
                    width:width,
                    height:height,
                    blockType:'water',
                    doCollision:false,
                    level:cubie.level,
                    spawned:true,
                });
                lastBlock.splice(0,0,[block.id,'block']);
                powerUsed += 1;
                break;
            case 'sign':
                var block = Block({
                    x:x,
                    y:y,
                    width:width,
                    height:height,
                    blockType:'sign',
                    message:'*This was a spawned\nsign*',
                    doCollision:false,
                    level:cubie.level,
                    spawned:true,
                });
                lastBlock.splice(0,0,[block.id,'block']);
                powerUsed += 1;
                break;
            case 'portal':
                var block = Block({
                    x:x,
                    y:y,
                    width:width,
                    height:height,
                    blockType:'portal',
                    doCollision:false,
                    level:cubie.level,
                    spawned:true,
                });
                lastBlock.splice(0,0,[block.id,'block']);
                powerUsed += 1;
                break;
            case 'blocker':
                var block = Block({
                    x:x,
                    y:y,
                    width:width,
                    height:height,
                    blockType:'blocker',
                    doCollision:false,
                    level:cubie.level,
                    spawned:true,
                });
                lastBlock.splice(0,0,[block.id,'block']);
                powerUsed += 1;
                break;
            case 'looseSand':
                for(var i = 0;i < width;i += gridSize){
                    for(var j = 0;j < height;j += gridSize){
                        var block = Block({
                            x:x + i,
                            y:y + j,
                            width:gridSize,
                            height:gridSize,
                            blockType:'sand',
                            doCollision:true,
                            level:cubie.level,
                            spawned:true,
                        });
                        lastBlock.splice(0,0,[block.id,'block']);
                        powerUsed += 1;
                    }
                }
                break;
            case 'monster':
                var monster = Monster({
                    x:x,
                    y:y,
                    width:width,
                    height:height,
                    moveSpeed:0.2,
                    jumpSpeed:0.7,
                    doCollision:true,
                    level:cubie.level,
                    spawned:true,
                });
                lastBlock.splice(0,0,[monster.id,'monster']);
                powerUsed += 1;
                break;
            case 'spawn':
                spawnPositions[cubie.level] = [x,y];
                cubie.spawnX = x;
                cubie.spawnY = y;
                powerUsed += 1;
                break;
            default:
                var block = Block({
                    x:x,
                    y:y,
                    width:width,
                    height:height,
                    blockType:mousePower,
                    doCollision:true,
                    level:cubie.level,
                    spawned:true,
                });
                lastBlock.splice(0,0,[block.id,'block']);
                powerUsed += 1;
                break;
        }
    }
}
onmouseclick = function(event){
    if(document.getElementById("pageDiv").style.display !== 'none'){
        return;
    }
    if(!mouseIn){
        return;
    }
    if(paused){
        return;
    }
    if(levelTeleport){
        cubie.x = mouseX - 15;
        cubie.y = mouseY - 15;
        cubie.spdX = 0;
        cubie.spdY = 0;
        powerUsed =+ 1;
    }
}
onmouseout = function(event){
    mouseIn = false;
    isClicking = false;
}
onmousein = function(event){
    mouseIn = true;
    isClicking = false;
}
document.onmousemove = function(event){
    mouseX = event.clientX - 9;
    mouseY = event.clientY - 9;
}


setInterval(function(){
    if(document.getElementById("pageDiv").style.display !== 'none'){
        return;
    }
    noStroke();
    fill(0,255,255,80);
    rect(0,0,600,600);
    if(!paused){
        if(time !== -1){
            time += 1;
        }
        drawText = false;
        cubie.update();
        for(var i in Monster.list){
            if(Monster.list[i].level === cubie.level && Monster.list[i].isVisible){
                Monster.list[i].update();
            }
            if(Monster.list[i].toRemove){
                delete Monster.list[i];
            }
        }
        for(var i in Block.list){
            if(Block.list[i].level === cubie.level){
                Block.list[i].update();
            }
            if(Block.list[i].toRemove){
                delete Block.list[i];
            }
        }
        for(var i in Monster.list){
            if(Monster.list[i].level === cubie.level && Monster.list[i].isVisible){
                Monster.list[i].draw();
            }
        }
        cubie.draw();
        if(levelCreator && isClicking){
            noStroke();
            fill(0, 125, 155, 125);
            var x = min(floor(levelMouseStartX / gridSize) * gridSize,floor(mouseX / gridSize) * gridSize);
            var y = min(floor(levelMouseStartY / gridSize) * gridSize,floor(mouseY / gridSize) * gridSize);
            var width = max(ceil(levelMouseStartX / gridSize) * gridSize,ceil(mouseX / gridSize) * gridSize) - min(floor(levelMouseStartX / gridSize) * gridSize,floor(mouseX / gridSize) * gridSize);
            var height = max(ceil(levelMouseStartY / gridSize) * gridSize,ceil(mouseY / gridSize) * gridSize) - min(floor(levelMouseStartY / gridSize) * gridSize,floor(mouseY / gridSize) * gridSize);
            //rect(x,y,width,height,gridSize / 6);
            rect(x,y,width,height);
        }
        if(drawText){
            strokeWeight(3);
            stroke(100, 50, 0);
            fill(155, 100, 0);
            rect(100,30,400,130);
            fill(0,0,0);
            text(textToDraw,300,125);
        }
    }
    else{
        for(var i in Block.list){
            if(Block.list[i].level === cubie.level){
                Block.list[i].draw();
            }
        }
        cubie.draw();
        fill(0, 0, 0, 75);
        rect(0,0,600,600);
        strokeWeight(3);
        stroke(100, 50, 0);
        fill(155, 100, 0);
        rect(100,30,400,130);
        fill(0,0,0);
        text('PAUSED',300,125);
    }
},1000/60);
level = 0;
//}

//Paste savecode here:

document.querySelectorAll("button").forEach(function(item){
    item.addEventListener('focus',function(){
        this.blur();
    });
});
document.oncontextmenu = function(event){
    event.preventDefault();
}