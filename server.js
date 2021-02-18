const e = require('express');
const { response } = require('express');
const express = require('express');
const app = express();
const server = app.listen(process.env.PORT || 5000);//app.listen(3000);

const io = require('socket.io')(server);
var currentVideoCode = 'ooOELrGMn14';
app.use(express.static('public'));
console.log("Server running... ");
const blockPassword = "dipper";
var blockedList = [];
const namesPrefix = ["Fluffy", "Big", "Large", "Hippity", "Small", "Cool", "Fast", "Intelligent", "Offbeat", "Inconclusive", "Undesirable", "Unbreakable", "Insane", "Stupid", "Goofy"];
const namesSuffix = ["Glass", "Water", "Phone", "Hippo", "Flamingo", "Cat", "Computer", "Bottle", "Mouse", "Rat", "Crow", "Elephant", "Gamer", "Loser", "Man", "Woman", "Clown", "Plague"];
var clientsObject = {};

io.on("connect", (socket) => {
  socket.on("addToRoom", (roomID) => {
	  room = roomID.toLowerCase();
    socket.join(room);//Join the room that is entered as prompt in client
    if(!clientsObject[room]){//If the room is not created, create one
      clientsObject[room] = [];//Create empty array to store NAME and SOCKET ID (first 4 digits)
	  clientsObject[room]['videoCode'] = '5OWOQF3dWi0';
	  console.log("WOLF VIDE");
    }

    let randomName = getRandomName();//Get a random name
    clientsObject[room].push([randomName, socket.id]);//In the room object append the NAME and SOCKET ID to it. This is a user.
	
    

    io.to(socket.id).emit('responseUsername', randomName);
    console.log(`Adding socket to room ${room}`);
    console.log(clientsObject);
    updateClientCount(room);
  });





  socket.on("disconnect", () => {
    console.log(`OBJECTs Length ${clientsObject.length}`);
    console.log(clientsObject);
    for(let i = 0; i < Object.keys(clientsObject).length; i++){

       for(let j = 0; j < clientsObject[Object.keys(clientsObject)[i]].length; j++){
          console.log(`Rooms ${clientsObject[Object.keys(clientsObject)[i]]}`)
          if(clientsObject[Object.keys(clientsObject)[i]][j][1] == socket.id){

            clientsObject[Object.keys(clientsObject)[i]].splice(j, 1);

            updateClientCount(Object.keys(clientsObject)[i]);

            if(clientsObject[Object.keys(clientsObject)[i]].length == 0){

              delete clientsObject[Object.keys(clientsObject)[i]];

            }
            console.log("OBJECT");
            console.log(clientsObject);
            return;
          }

        }
    }
    // //delete clientsObject[room];//Remove from object.
    // updateClientCount();//Client will be deleted from clientObject in updateClientCount();
    // try{//Try block incase we get -1. Or the person wasn't blocked
    //   blockedList.splice(blockedList.indexOf(socket.id), 1);
    // }
    // catch(error){
    //   console.log("Person not blocked")
    // }
    // console.log(`UPDATED: ${clientsObject}`)
  });



  socket.on('firstTimeRequestForTime', (room) => {
      console.log(`First Time request from: ${socket.id}`)
      console.log(Object.keys(clientsObject));
      //io.to(Object.keys(clientsObject)[0]).emit("sendTimeData");//This will tell master socket (first person to connect) to pause video which will jump EVERYONE to current position.
      //io.to(clientsObject[room][0])
    if(clientsObject[room].length > 1){
      //io.to(clientsObject[room][0][1]).emit("sendTimeData");
      io.to(clientsObject[room][0][1]).emit("sendTimeData", socket.id);//Tell the captain client to send its time to server
    }
    
      console.log(`FIRST TIME ${room} obj:`);
      console.log(clientsObject)
        //console.log(`First Time Request sending to ${clientsObject[room][0]}`);
  });
  socket.on("sendTime", (data) => {//Recieve the time and the new client's id and send them new time
    io.to(data.id).emit("recieveTime", data.time)
  })
  socket.on('sendUsername', (data) => {
    console.log(`Changing name | CurrentName: ${data.currentName} | Newname ${data.name}`)
    let outputData = [false, true];//First index is whether it failed. Second is if its too long
    let invalid = false;//Variable to store whether the username is invalid throughout the search
    for(let i = 0; i < clientsObject[data.room].length; i++){//Search through the clients Object if names is taken
      let objectName = clientsObject[data.room][i][0].toLowerCase();//For readability
      //console.log(objectName)
      if(objectName == data.name.toLowerCase()){//Same name
        outputData[0] = true;
        outputData[1] = false;
        invalid = true;
      }
      else if(data.name.length > 18){// Name too long | We know name is already tooLong = true, but gotta make first indsx (failed or not) to true
        outputData[0] = true;
        invalid = true;
      }
      if(invalid) break;//If problem found, just leave the loop
    }
    if(!invalid){//If no problems, update name on server object and globally on clients
      for(let i = 0; i < clientsObject[data.room].length; i++){

        console.log(`Iteration i:${i} currentName: ${data.currentName} proposedName: ${clientsObject[data.room][i][0]}`)

        if(clientsObject[data.room][i][0] == data.currentName){
          console.log(`Updating ${data.currentName} to ${data.name} I = ${i}`)
          clientsObject[data.room][i][0] = data.name
        }
      }
      if(blockedList.includes(data.currentName)){
        blockedList[blockedList.indexOf(data.currentName)] = data.name;
      }
      updateClientCount(data.room);
    }


    io.to(socket.id).emit('usernameTaken', outputData);
    console.log(clientsObject);

  });
  socket.on('playerIsReady', (room) => {
		console.log(`Player ready: ${room}`);
	socket.emit("firstConnectVideo", clientsObject[room]['videoCode']);
    //io.emit("forClient", currentVideoCode);
    //io.sockets.connected[socket.id].emit("firstConnectVideo", currentVideoCode);
    //console.log(`Player ready ${socket.id}`);
  });
  socket.on("eventChange", (data) => {
    console.log(data.id)
    if(blockedList.includes(data.id)){
      return;
    }
    //  console.log(data);
      io.to(data.room).emit("forClient", data);
  });

  socket.on("changeVideo", (data) =>{//HERE
    console.log(data.id)
    if(blockedList.includes(data.id)){
      return;
    }
	let vc = extractID(data.url);
    clientsObject[data.room]['videoCode'] = vc;
	console.log(clientsObject);
	//currentVideoCode = extractID(data.url);
	  io.to(data.room).emit("forClient", vc);
  });

  socket.on("blockUser", (data) => {
    console.log(`Blocking ${data.client} with password ${data.password}`);
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

      io.to(data.room).emit("changeBlockedUser", dataToSend);
    }
    console.log(blockedList);
  });





})

function updateClientCount(room){

  let data = {
    client: clientsObject[room],
    blockedUsers: blockedList
  }
  //console.log(`Data: ${data.client}`);
  io.to(room).emit("clientCount", data);

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

function getRandomName(){
  return(`${namesPrefix[Math.floor(Math.random() * namesPrefix.length)]} ${namesSuffix[Math.floor(Math.random() * namesSuffix.length)]}`)
}

function blockCheck(id){
  return(blockedList.includes(Object.values(clientsObject)[Object.keys(clientsObject).indexOf(id)]));
}
