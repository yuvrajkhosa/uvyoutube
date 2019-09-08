const express = require('express');
const app = express();
const server = app.listen(3000);
const io = require('socket.io')(server);
var currentVideoCode = 'ooOELrGMn14';
app.use(express.static('public'));
console.log("Server running... ");
const blockPassword = "nojooda";
var clientsObject = {};
var blockedList = [];

io.on("connect", (socket) => {
  clientsObject[socket.id] = socket.handshake.address;
  updateClientCount(true);
  console.log(clientsObject)



  socket.on("disconnect", () => {
    delete clientsObject[socket.id];
    updateClientCount(false);//Client will be deleted from clientObject in updateClientCount();



    console.log(clientsObject);
  });


  socket.on('firstTimeRequestForTime', () => {
      // console.log(Object.keys(clientsObject));
      io.sockets.connected[Object.keys(clientsObject)[0]].emit("sendTimeData");//This will tell master socket (first person to connect) to pause video which will jump EVERYONE to current position.
  });
  socket.on('playerIsReady', () => {
    //io.emit("forClient", currentVideoCode);
    io.sockets.connected[socket.id].emit("firstConnectVideo", currentVideoCode);
    console.log(`Player ready ${socket.id}`);
  });
  socket.on("eventChange", (data) => {
      if(blockedList.includes(socket.handshake.address)){//If ip is blocked, just return
        return;
      }
      console.log(data);
      io.emit("forClient", data);
  });

  socket.on("changeVideo", (url) =>{
    if(blockedList.includes(socket.handshake.address)){
      return;
    }
    currentVideoCode = extractID(url);
	  io.emit("forClient", currentVideoCode);
  });

  socket.on("blockUser", (data) => {
    console.log(`Blocking ${data.client} with password ${data.password}`);
    if(data.password == blockPassword){
      let dataToSend = {
        isBlocked: true,
        client: data.client
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
  });





})

function updateClientCount(isAdded){

  let data = {
    isAdded: isAdded,
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
