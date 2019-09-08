var socket;
var socketId;
var counter = 0;
var inputURL = document.getElementById("inputURL");
socket = io.connect('/');

var selectedUserToBlock;



// Load the IFrame Player API code asynchronously.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var doNotChange;
var player;
window.onYouTubeIframeAPIReady = function() {
  player = new YT.Player('player', {
      videoId: 'ErQQc6cUSTA',
      height: '600',
      width: '1000',
      playerVars: {
          color: "blue",
          controls: 1,
          autoplay: 0,
          enablejsapi: 1,
          iv_load_policy: 3,
          modestbranding: 1,
          showinfo: 1,
		  rel: 0,
		  origin: "https://www.youtube.com"
      },
      events: {
        "onReady" : onPlayerReady,
        "onStateChange": onPlayerStateChange
      }
  });
};

function onPlayerStateChange(event){
  if(player.getPlayerState() != 1 && player.getPlayerState() != 2) return;
  console.log(`State Change: ${event.data} doNotChange = ${doNotChange} counter = ${counter}`)

  if(counter == 0){
    if(!doNotChange){//doNotChange first set in firstConnection funcition
      console.log("Emitting...");
      socket.emit("eventChange",
      {
        "id": socketId,
        "type": event.data,
        "time": player.getCurrentTime()
      });
    }
    else{
      // var recheckVideoStatus = setInterval(() => {//If first time loading in then check if video is loaded every 500ms, once it is, set doNotChange (makes it so no signall given to server) to FALSE and clear the interval to check if video is loaded
      //     console.log("INTERVAL");
      //     if(player.getPlayerState() == 1){//Video loaded
      //       doNotChange = false;
      //
      //       //Request for master socket to send back current time
      //       socket.emit("firstTimeRequestForTime");//If this is the first client in server, then the server makes this client the master client. So, it will tell this client (master client) to pause video to let everyone else catch up. But since this is only client it also serves as autoPlay off. Because it just pauses when you join
      //       console.log("Video loaded and playing and time data requested" + " DoNotChange = " + doNotChange);
      //
      //       clearInterval(recheckVideoStatus);
      //     }
      // }, 1000)
      console.log("else block");
      setTimeout(() => {
        doNotChange = false;
        socket.emit("firstTimeRequestForTime");
        console.log(player.getPlayerState());
        }, 800);
    }
  }
  else{
    counter--;
    console.log(`Do not change = ${doNotChange} Counter = ${counter}`);

  }

}

inputURL.addEventListener("keyup", event => {//Press enter in input bar
  if(event.keyCode == 13){
    event.preventDefault();
    sendURLToServer(inputURL.value);
  }
});

function sendURLToServer(url){
    if(url == ""){
      console.error("NO URL")
    }
    else{
      socket.emit("changeVideo", url);
      console.log(url);
    }


}

socket.on('clientCount', (data) => {

    while(document.getElementById("clientList").hasChildNodes()){//While there are still list items (client names) in the unordered list, keep removing them to start from a fresh slate
      document.getElementById("clientList").removeChild(document.getElementById("clientList").firstChild);
    }
    for(let i = 0; i < data.client.length; i++){//Add all the clients one by one
      let node = document.createElement("button");


      document.getElementById("clientList").appendChild(node);
      node.onclick = () => clientClicked(data.client[i]);//On click execute clientCLicked() with the IP of the client as an argument.
      node.innerHTML = `<span>${data.client[i].substring(7)}</span>`;
      if(data.blockedUsers.includes(data.client[i])){//Server tells which users are blocked, if this user is in blocked list then maek then red
        node.style.backgroundColor = 'fireBrick';//SEt here because javascript cant grab color info from css without Window.getComputedStyle();
      }
      else{
        node.style.backgroundColor = 'grey';//Set here becausse we need to access it later
      }
      node.classList.add('clientText');//Add this class
    }
    let clientsCount = data.client.length;
    if(clientsCount > 1){
      document.getElementById("clientOrClients").innerHTML = "Clients";
    }
    else{
      document.getElementById("clientOrClients").innerHTML = "Client";
    }
    //
    // if(document.getElementById("clientCount").innerHTML < clientsCount){
    //   joinSound.play();
    //
    // }
    // else if(document.getElementById("clientCount").innerHTML > clientsCount){//DIdnt use else because otherwise sound plays on first join because client count and innerHTML is equal
    //   leftSound.play();
    // }
    document.getElementById("clientCount").innerHTML = clientsCount;


})

socket.on('connect', () => {
  socketId = socket.id;
  console.log(`${socketId} connected`);

});

socket.on('sendTimeData', () => {

  if(player.getPlayerState() == 1){
    player.pauseVideo();
  }
  else{
    player.playVideo();
    setTimeout(() => {
      console.log("Pausing");
      pause();//Must use function because of some scope issue
      reverseOneSecond();
    }, 1000);
  }

})

socket.on('forClient', (data) => {
  if(typeof data == "string"){
    player.loadVideoById(data);
    console.log("Changing video");
  }
  else{
    if(data.id != socketId){//Execute if message not from self
      console.log(`Type: ${data.type}`);
      switch(data.type){
        case(1):
          console.log("Playing... ");
          counter = 1;
          player.seekTo(data.time);
          player.playVideo();
        break;

        case(2):
          console.log("Pausing... ");
          player.seekTo(data.time);
          player.pauseVideo();
        break;

      }
    }
  }
})
function reverseOneSecond(){
  player.seekTo(player.getCurrentTime() - 1);
}
function pause(){
  player.pauseVideo();
}
socket.on('firstConnectVideo', (url) =>{
    doNotChange = true;

    player.loadVideoById(url);
    console.log("First connection");
})
function onPlayerReady(){
  socket.emit('playerIsReady');
  console.log("Ready");
}

socket.on('changeBlockedUser', (data) => {
  let textNode = document.getElementById("clientList").children;//Store this as variable for readability
  for(let i = 0; i < textNode.length; i++){//Go through the buttons of the unordered list

    if(textNode[i].innerHTML.substring(6, textNode[i].innerHTML.indexOf("/") - 1) == data.client.substring(7)){//This is to get only IP and not <span> and </span> element

      if(textNode[i].style.backgroundColor == 'grey'){//If it is not blocked (color is grey)
        textNode[i].style.backgroundColor = 'fireBrick';//Change to red
      }
      else{
        textNode[i].style.backgroundColor = 'grey';//Otherwise person is blocked and change back to grey
      }
    }
  }
});



document.getElementById("passwordCheck").addEventListener("keyup", event => {//Press enter in input bar
  if(event.keyCode == 13){
    event.preventDefault();
    socket.emit("blockUser", {client: selectedUserToBlock, password: document.getElementById("passwordCheck").value})
    document.getElementById("passwordCheck").value = "";
    document.getElementById("passwordCheck").placeholder = "Password";
  }
});

function clientClicked(client){
  selectedUserToBlock = client;
  document.getElementById("passwordCheck").focus();

}
