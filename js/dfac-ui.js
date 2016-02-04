var dsAddress = "http://172.16.1.11/";
var dfacTasks = [];
var taskNums = [];
var dfacSelectedTask = 0;
var dfacPrototypeTask = {
	"name":			"",
	"lat":			0,
	"lon":			0,
	"type":			0,
	"description":	"",
	"number":		0
}
var dfacDrones = [];
var dfacPrototypeDrone = {
	"name":			"",
	"lat":			0,
	"lon":			0,
	"batt":			0,
	"taskName":		"",
	"taskNumber":	0
}
var dfacActiveTasks = [];
var dfacMarkers = [0,[],[]];
var dfacMap;
var pickLocation = false;
var tuscon = {lat: 32.221, lng: -110.926};
var gDroneIcon;
var gActiveTaskIcon;
var gTaskIcon;

function initMap() {
	dfacMap = new google.maps.Map(document.getElementById('dfac-map'), {
		center: {lat: 32.221, lng: -110.926},
		scrollwheel: true,
		zoom: 12,
		zoomControl: true,
		mapTypeControl: true,
		scaleControl: true,
		streetViewControl: false,
		rotateControl: true
	});
	google.maps.event.addListener(dfacMap,'click',dfacMapClick);
	dsRefreshDrones();
	dsRefreshTasks();
	$("#dfac-server-update").click(function(){dsAddress=$("#dfac-server-address").val();});
	$("#dfac-action-update").click(dfacUpdateTask);
	$("#dfac-action-locate").click(dfacPickLocation);
	$("#dfac-action-cancel").click(dfacCancelTask);
	$("#dfac-action-add").click(dfacAddTask);
	gDroneIcon = {
		url: "./img/drone2.svg",
		anchor: new google.maps.Point(25,25),
		scaledSize: new google.maps.Size(50,50)
	};
	gActiveTaskIcon = {
		url: "./img/marker2A.svg",
		anchor: new google.maps.Point(20,20),
		scaledSize: new google.maps.Size(40,40)
	};
	gTaskIcon = {
		url: "./img/marker2N.svg",
		anchor: new google.maps.Point(20,20),
		scaledSize: new google.maps.Size(40,40)
	};
}

function dsRefreshDrones(oneshot){
	oneshot = typeof oneshot !== 'undefined' ? oneshot : false;
	$.get(dsAddress,"drones",function(data){
		var numDrones = 0;
		var droneNums = [];
		dfacActiveTasks = [];
		for(var drone in data.drones){
			dfacPutDrone(data.drones[drone]);
			numDrones++;
			droneNums.push(data.drones[drone].number);
			dfacActiveTasks.push(data.drones[drone].taskNumber.toString());
		}
		for(var drone in dfacDrones){
			if(droneNums.indexOf(dfacDrones[drone].number)==-1){
				dfacRemoveDrone(dfacDrones[drone].number);
			}
		}
		$("#dfac-drones-count").text(numDrones+" Active");
		dfacDrones = data.drones;
	},"json")
	if(!oneshot){
		window.setTimeout(dsRefreshDrones,500);
	}
}

function dsRefreshTasks(oneshot){
	oneshot = typeof oneshot !== 'undefined' ? oneshot : false;
	$.get(dsAddress,"tasks",function(data){
		var numTasks = 0;
		taskNums = [];
		for(var task in data.tasks){
			dfacPutTask(data.tasks[task]);
			numTasks++;
			taskNums.push(data.tasks[task].number);
		}
		for(var task in dfacTasks){
			if(taskNums.indexOf(dfacTasks[task].number)==-1){
				dfacRemoveTask(dfacTasks[task].number);
			}
		}
		$("#dfac-tasks-count").text(numTasks+" Tasks");
		dfacTasks = data.tasks;
	},"json")
	if(!oneshot){
		window.setTimeout(dsRefreshTasks,5000);
	}
}

function dsPushTask(task){
	if((typeof(task.name)=='string')&&(typeof(task.description)=='string')&&(!isNaN(task.lat))&&(task.lat!="")&&(!isNaN(task.lon))&&(task.lon!="")&&(!isNaN(task.type))&&(task.type!="")&&(!isNaN(task.number))&&(task.number>=0)){
		$.get(dsAddress,""+task.name+","+task.lat+","+task.lon+","+task.type+","+task.description+","+task.number);
		dsRefreshTasks(true);
	}else{
		alert("Invalid data input!");
	}
}

function dfacPutDrone(drone){
	if(!($("#dfac-drone-"+drone.number).length)){
		$("#dfac-drones").append("\
		<div id=\"dfac-drone-"+drone.number+"\" class=\"dfac-task\"><table id=\"dfac-drone-table-"+drone.number+"\" class=\"dfac-task-table\">\
		<tr><td class=\"dfac-task-ref\">Name:<\/td><td class=\"dfac-task-data\"><p id=\"dfac-drone-name-"+drone.number+"\" class=\"dfac-task-idata\"><\/p><p id=\"dfac-drone-number-"+drone.number+"\" class=\"dfac-task-idata dfac-task-number\"><\/p><\/td><\/tr>\
		<tr><td class=\"dfac-task-ref\">Task:<\/td><td class=\"dfac-task-data\"><p id=\"dfac-drone-task-"+drone.number+"\" class=\"dfac-task-idata\"><\/p><p id=\"dfac-drone-task-number-"+drone.number+"\" class=\"dfac-task-idata dfac-task-number dfac-task-active\"><\/p><\/td><\/tr>\
		<tr><td class=\"dfac-task-ref\">Pos:<\/td><td class=\"dfac-task-data\"><p id=\"dfac-drone-position-"+drone.number+"\" class=\"dfac-task-idata\"><\/p><div id=\"dfac-drone-center-"+drone.number+"\" class=\"dfac-task-idata dfac-task-center\">&lt;&gt;<\/div><\/td><\/tr>\
		<tr><td class=\"dfac-task-ref\">Batt:<\/td><td id=\"dfac-drone-batt-"+drone.number+"\" class=\"dfac-task-data\"><\/td><\/tr><\/table><\/div>\
		");
		$("#dfac-drone-center-"+drone.number).click(function(){dfacCenter(1,drone.number);});
		$("#dfac-drone-task-number-"+drone.number).click(function(){dfacSelect(drone.taskNumber);});
	}
	$("#dfac-drone-name-"+drone.number).text(drone.name);
	$("#dfac-drone-number-"+drone.number).text(drone.number);
	$("#dfac-drone-task-"+drone.number).text(drone.taskName);
	$("#dfac-drone-task-number-"+drone.number).text(drone.taskNumber);
	$("#dfac-drone-position-"+drone.number).text(drone.lat.toFixed(5)+", "+drone.lon.toFixed(5));
	$("#dfac-drone-batt-"+drone.number).text(drone.batt+"%");
	dfacSetMarker(1,drone);
}

function dfacRemoveDrone(number){
	$("#dfac-drone-"+number).remove();
	dfacClearMarker(1,number);
}

function dfacPutTask(task){
	if(!($("#dfac-task-"+task.number).length)){
		$("#dfac-other-tasks").append("\
		<div id=\"dfac-task-"+task.number+"\" class=\"dfac-task\"><table id=\"dfac-task-table-"+task.number+"\" class=\"dfac-task-table\">\
		<tr><td class=\"dfac-task-ref\">Task:<\/td><td class=\"dfac-task-data\"><p id=\"dfac-task-name-"+task.number+"\" class=\"dfac-task-idata\"><\/p><p id=\"dfac-task-number-"+task.number+"\" class=\"dfac-task-idata dfac-task-number\"><\/p><\/td><\/tr>\
		<tr><td class=\"dfac-task-ref\">Pos:<\/td><td class=\"dfac-task-data\"><p id=\"dfac-task-position-"+task.number+"\" class=\"dfac-task-idata\"><\/p><div id=\"dfac-task-center-"+task.number+"\" class=\"dfac-task-idata dfac-task-center\">&lt;&gt;<\/div><\/td><\/tr>\
		<tr><td class=\"dfac-task-ref\">Type:<\/td><td class=\"dfac-task-data\"><p id=\"dfac-task-type-"+task.number+"\" class=\"dfac-task-idata\"><\/p><\/td><\/tr>\
		<tr><td class=\"dfac-task-ref\">Desc:<\/td><td id=\"dfac-task-desc-"+task.number+"\" class=\"dfac-task-data\"><\/td><\/tr><\/table><\/div>\
		");
		$("#dfac-task-center-"+task.number).click(function(){dfacCenter(2,task.number);});
		$("#dfac-task-number-"+task.number).click(function(){dfacSelect(task.number);});
	}
	$("#dfac-task-type-"+task.number).text(task.type);
	$("#dfac-task-name-"+task.number).text(task.name);
	$("#dfac-task-number-"+task.number).text(task.number);
	$("#dfac-task-position-"+task.number).text(task.lat.toFixed(5)+", "+task.lon.toFixed(5));
	$("#dfac-task-desc-"+task.number).text(task.description);
	if(dfacActiveTasks.indexOf(task.number.toString())>=0){
		console.log(dfacActiveTasks.indexOf(toString(task.number)));
		$("#dfac-task-number-"+task.number).addClass("dfac-task-active");
		$("#dfac-task-"+task.number).appendTo("#dfac-active-tasks");
		dfacSetMarker(2,task,1);
	}else{
		$("#dfac-task-number-"+task.number).removeClass("dfac-task-active");
		$("#dfac-task-"+task.number).appendTo("#dfac-other-tasks");
		dfacSetMarker(2,task,0);
	}
}

function dfacRemoveTask(number){
	$("#dfac-task-"+number).remove();
	dfacClearMarker(2,number);
}

function dfacGetObj(dType,dNum){
	if(dType){
		if(dType==1){
			dSet=dfacDrones;
		}else if(dType==2){
			dSet=dfacTasks;
		}
		var dIndex=0;
		for(var item in dSet){
			if(dSet[item].number==dNum){
				dIndex=item;
			}
		}
		if(dIndex){
			return(dSet[dIndex]);
		}else{
			return(-1);
		}
	}else{
		return(-1);
	}
}

function dfacCenter(dType,dNum){
	if(dType){
		newZoom=18;
		var dObj = dfacGetObj(dType,dNum);
		if(dObj){
			var newCenter = new google.maps.LatLng(dObj.lat,dObj.lon);
		}else{
			var newCenter = tuscon;
		}
	}else{
		var newCenter = tuscon;
		newZoom=12;
	}
	dfacMap.panTo(newCenter);
	dfacMap.setZoom(newZoom);
}

function dfacSetMarker(dType,dObj,dIcon){
	var newPosition = new google.maps.LatLng(dObj.lat,dObj.lon);
	if((dfacMarkers[dType][dObj.number])){
		dfacMarkers[dType][dObj.number].setPosition(newPosition);
		if(typeof(dIcon)!='undefined'){
			if(dIcon){
				var newIcon = gActiveTaskIcon;
			}else{
				var newIcon = gTaskIcon;
			}
			dfacMarkers[dType][dObj.number].setIcon(newIcon);
		}
	}else{
		if(dType==1){
			var newIcon = gDroneIcon;
		}else{
			if(dIcon){
				var newIcon = gActiveTaskIcon;
			}else{
				var newIcon = gTaskIcon;
			}
		}
		dfacMarkers[dType][dObj.number]=new google.maps.Marker({
			position: newPosition,
			map: dfacMap,
			draggable: false,
			icon: newIcon
		});
		if(dType==2){
			dfacMarkers[dType][dObj.number].addListener('click',function(){dfacSelect(dObj.number)});
		}
	}
}

function dfacClearMarker(dType,dNum){
	if(dfacMarkers[dType][dNum]){
	dfacMarkers[dType][dNum].setMap(null);
	dfacMarkers[dType][dNum]=0;
	}
}

function dfacSelect(taskNumber){
	$("#dfac-task-selected").text(taskNumber);
	task = dfacGetObj(2,taskNumber);
	$("#dfac-task-name-i").val(task.name);
	$("#dfac-task-number-i").text(task.number);
	$("#dfac-task-lat-i").val(task.lat);
	$("#dfac-task-lon-i").val(task.lon);
	$("#dfac-task-type-i").val(task.type);
	$("#dfac-task-desc-i").val(task.description);
}

function dfacUpdateTask(){
	var newTask = dfacPrototypeTask;
	newTask.name=$("#dfac-task-name-i").val();
	newTask.number=parseInt($("#dfac-task-number-i").text());
	newTask.lat=$("#dfac-task-lat-i").val();
	newTask.lon=$("#dfac-task-lon-i").val();
	newTask.type=$("#dfac-task-type-i").val();
	newTask.description=$("#dfac-task-desc-i").val();
	dsPushTask(newTask);
	if($("#dfac-task-number-i").text()=="0"){
		dfacAddTask();
	}
}

function dfacCancelTask(){
	var newTask = dfacPrototypeTask;
	newTask.name="";
	newTask.number=parseInt($("#dfac-task-number-i").text());
	newTask.lat="0";
	newTask.lon="0";
	newTask.type="0";
	newTask.description="";
	dsPushTask(newTask);
}

function dfacAddTask(){
	$("#dfac-task-selected").text("New");
	$("#dfac-task-name-i").val("");
	$("#dfac-task-number-i").text("0");
	$("#dfac-task-lat-i").val("");
	$("#dfac-task-lon-i").val("");
	$("#dfac-task-type-i").val("");
	$("#dfac-task-desc-i").val("");
}

function dfacPickLocation(){
	pickLocation=true;
}

function dfacMapClick(mapEvent){
	if(pickLocation){
		$("#dfac-task-lat-i").val(mapEvent.latLng.lat);
		$("#dfac-task-lon-i").val(mapEvent.latLng.lng);
		pickLocation=false;
	}
}