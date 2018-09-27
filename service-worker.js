var config = {
 'messagingSenderId': '388774867117'
};











var obj={};
importScripts('https://www.gstatic.com/firebasejs/3.5.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.5.0/firebase-messaging.js');

firebase.initializeApp(config); //initializing the firebase with messaging id

var messaging = firebase.messaging();

// Setting the message handler to recieve notifications when on foreground
messaging.setBackgroundMessageHandler(function (payload) {
    obj=payload;
    var notificationTitle = payload.data.title;
    var notificationOptions = {
        body: payload.data.body,
        icon: payload.data.icon,
        image: (payload.data.image)?payload.data.image:null,
        actions: [],
        requireInteraction: (payload.data.user_interaction)?null:20
    };

    if (payload.data.hasOwnProperty('cta')) {
        var ctadata = JSON.parse(payload.data.cta);
        for (var i=0;i<ctadata.length;i++)
            notificationOptions.actions.push({action:ctadata[i].url,title:ctadata[i].cta,icon:ctadata[i].icon});
    }

    function useData(){ // calling the function to get data from api
        return new Promise(function(resolve,reject){
            fetch('https://ipapi.co/json/',{ // to get the details like ip,city,country,postal,timezone etc
                method : 'get'
            }).then(function (response) {
                return response.json();
            }).then(function(data){
                resolve(data);
            }).catch(function (err) {
                reject(err);
            });
        });
    }


    return self.registration.showNotification(notificationTitle,notificationOptions).then(function (responce) {
        useData().then(function(data){
            payload.location_data = data;
            obj.location_data = data;
            notificationViewEventHandler(payload);
        }).catch(function (err) {
            //Api call failed for location
        })
    }).catch(function (err) {
        // if some error arises when notification is send but coun't able to display
    });
});


self.addEventListener('notificationclick', function (event) {
    event.preventDefault();
    event.notification.close();
    if (event.action) {
        ((event.action === JSON.parse(obj.data.cta)[0].url) ? (obj.cta1_click=true) : (obj.cta2_click=true));
        event.waitUntil(clients.openWindow(event.action));
    } else if (obj.data.notification_url) {
        event.waitUntil(clients.openWindow(obj.data.notification_url));
    } else {
        //no event should take place it payload.data.url is empty.
    }
    notificationClickEventHandler(obj);
});


function notificationClickEventHandler(payload){
    var object = {
        "location_info":{
            "ip": obj.location_data.ip,
            "country_code": obj.location_data.country,
            "country_name": obj.location_data.country_name
        }
    };
    (obj.hasOwnProperty('cta1_click'))?(object.cta1_click=true) : (obj.hasOwnProperty('cta2_click'))?(object.cta2_click=true):null;
    fetch('https://www.engageto.com:8081/v1/notifications/'+obj.data.resource_id+'/click',{
        method:'post',
        headers:{
            'Content-type':'application/json'
        },
        body: JSON.stringify(object)
    }).then(function (response) {
        if(response.status === 200){
            console.log('Notification click api call is sucessfull');
        }else{
            console.log('Notification click api call unsucessfull');
        }
    }).catch(function(err){
        console.log('error occure while Notification click call',err);
    });
}

function notificationViewEventHandler(payload) {
    fetch('https://www.engageto.com:8081/v1/notifications/'+payload.data.resource_id+'/view',{
        method:'post',
        headers:{
            'Content-type':'application/json'
        },
        body: JSON.stringify({
            "location_info":{
                "ip": payload.location_data.ip,
                "country_code": payload.location_data.country,
                "country_name": payload.location_data.country_name
            }
        })
    }).then(function (response) {
        if(response.status === 200){
            console.log('notification view api call is sucessfull');
        }else{
            console.log('notification view api call unsucessfull');
        }
    }).catch(function(err){
        console.log('error occure while calling notification view api');
    });
}
