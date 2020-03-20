const express = require('express');
const app = express();
const server = app.listen(process.env.PORT || 5000);//CHANGE THIS IF LOCAL
const io = require('socket.io')(server);
var currentVideoCode = 'ooOELrGMn14';
app.use(express.static('public'));
console.log("Server running... ");
const blockPassword = "ratraj";
var blockedList = [];
const namesPrefix = ["Fluffy", "Big", "Large", "Hippity", "Small", "Cool"];
const namesSuffix = ["Glass", "Water", "Phone", "Hippo", "Flamingo", "Cat"];

var clientsObject = {};

io.on("connect", (socket) => {
  clientsObject[socket.id] = randomName();//Get random name assign to this socket.id. Must use full socket.id so we can sync up in beginnig
  io.to(socket.id).emit('responseUsername', clientsObject[socket.id]);
  console.log(clientsObject);
  updateClientCount();


  socket.on("disconnect", () => {
    delete clientsObject[socket.id];//Remove from object.
    updateClientCount(false);//Client will be deleted from clientObject in updateClientCount();
    try{//Try block incase we get -1. Or the person wasn't blocked
      blockedList.splice(blockedList.indexOf(socket.id), 1);
    }
    catch(error){
      console.log("Person not blocked")
    }

  });


  socket.on('firstTimeRequestForTime', () => {
      // console.log(Object.keys(clientsObject));
      io.to(Object.keys(clientsObject)[0]).emit("sendTimeData");//This will tell master socket (first person to connect) to pause video which will jump EVERYONE to current position.
  });
  socket.on('sendUsername', (name) => {
    let data = [false, true];//First index is whether it failed. Second is if its too long
    let invalid = false;//Variable to store whether the username is invalid throughout the search
    for(let i = 0; i < Object.values(clientsObject).length; i++){//Search through the clients Object if names is taken
      let objectName = Object.values(clientsObject)[i].toLowerCase();//For readability
      console.log(objectName)
      if(objectName == name.toLowerCase()){//Same name
        data[0] = true;
        data[1] = false;
        invalid = true;
      }
      else if(name.length > 18){// Name too long | We know name is already tooLong = true, but gotta make first indsx (failed or not) to true
        data[0] = true;
        invalid = true;
      }
      if(invalid) break;//If problem found, just leave the loop
    }
    if(!invalid){//If no problems, update name on server object and globally on clients
      clientsObject[socket.id] = name;
      updateClientCount();
    }


    io.to(socket.id).emit('usernameTaken', data);
    console.log(`Username ${name}`);

  });
  socket.on('playerIsReady', () => {
    //io.emit("forClient", currentVideoCode);
    io.sockets.connected[socket.id].emit("firstConnectVideo", currentVideoCode);
    console.log(`Player ready ${socket.id}`);
  });
  socket.on("eventChange", (data) => {
    if(blockCheck(socket.id)){
      return;
    }
    //  console.log(data);
      io.emit("forClient", data);
  });

  socket.on("changeVideo", (url) =>{
    if(blockCheck(socket.id)){
      return;
    }
    currentVideoCode = extractID(url);
	  io.emit("forClient", currentVideoCode);
  });

  socket.on("blockUser", (data) => {
    console.log(`Blocking ${data.client} with password ${data.password} id ${Object.keys(clientsObject)[Object.values(clientsObject).indexOf(data.client)]}`);
    //let id = Object.keys(clientsObject)[Object.values(clientsObject).indexOf(data.client)];

    if(data.password == blockPassword){
      let dataToSend = {
        isBlocked: true,
        client: data.client,

      }
      if(blockedList.includes(data.client)){//If user already blocked, unblock them and set isBlocked to false


        blockedList.splice(blockedList.indexOf(data.client), 1);
        dataToSend['isBlocked'] = false;

      }
      else{//Add user to blocked list
        blockedList.push(data.client);

      }

      io.emit("changeBlockedUser", dataToSend);
    }
    console.log(blockedList);
  });





})

function updateClientCount(isAdded){

  let data = {
    client: Object.values(clientsObject),
    blockedUsers: blockedList
  }

  io.emit("clientCount", data);

}

function extractID(url){
  var finalString;
  if(url.includes(".com")){//Nomral url looking for "com" because only normal urls have .com
    if(url.includes("&")){//Check if any url parameters are present
      console.log("1")
     finalString = (url.substring(url.indexOf("=") + 1, url.indexOf("&")))//Go from the equals to the parameters
    }
    else{
      console.log("2")
      finalString = (url.substring(url.indexOf("=") + 1));//No parameters.
    }
  }
  else{//youtu.be url
    if(url.includes("?")){//If using shortened youtu.be url.
      console.log("3")
      finalString = (url.substring(url.indexOf("/", 10) + 1, url.indexOf("?")))
    }
    else{
      console.log("4")
      finalString = (url.substring(url.indexOf("/", 10) + 1));
    }
  }
  return(finalString);
}

function randomName(){
  return(`${namesPrefix[Math.floor(Math.random() * namesPrefix.length)]} ${namesSuffix[Math.floor(Math.random() * namesSuffix.length)]}`)
}

function blockCheck(id){
  return(blockedList.includes(Object.values(clientsObject)[Object.keys(clientsObject).indexOf(id)]));
}
