var subdomain = 'https://anuragpur.engageto.com/';
var subdomainid ='22a44f05da0a6fb31d9d8ef5b014a98b';
var config = {
 'messagingSenderId': '388774867117'
};






// checking wether the url is https or http
var targetWindow=location.protocol==='https:'?window:window.opener;

firebase.initializeApp(config);
/*
 * Creating a FCM messaging instance
 */
var messaging = firebase.messaging();
var subscriberDetails = {
    domainid: subdomainid,
    token: '',
    browser: '',
    OS: '',
    subscribedURL: '',
    subscribedDate: '',
    geoLocation:'',
    vap_id:''
};

var subscriberPromise = '';

function getBrowser() {
    if (!!window.chrome && !!window.chrome.webstore) {
        return 'Chrome';
    } else if (typeof InstallTrigger !== 'undefined') {
        return 'Firefox';
    } else if (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) {
        return 'Opera';
    }  else if (Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0) {
        return 'Safari';
    } else {
        return 'Others';
    }
}

function getSubscriberDetails() {
    subscriberPromise = new Promise(function (resolve, reject) {
        subscriberDetails.browser = getBrowser();
        subscriberDetails.subscribedURL = window.location.href;
        subscriberDetails.subscribedDate = new Date();
        subscriberDetails.OS = navigator.platform;
        resolve(subscriberDetails);
    });
}

getUserSubscription= function () {
           return new Promise(function(resolve,reject){
                        navigator.serviceWorker.register('service-worker.js').then(function (serviceWorkerRegistration) {
              serviceWorkerRegistration.pushManager.getSubscription().then(function (e) {
                if (e) {
	          resolve(btoa(String.fromCharCode.apply(null, new Uint8Array(e.getKey("p256dh")))));
                } else {
                 resolve(false);
                }
              }).catch(function () {
               resolve(false);
              });
            })
           })
             
          }

if ('serviceWorker' in navigator) {
    /* Register service worker */
    navigator.serviceWorker.register('service-worker.js').then(function (reg) {
        messaging.useServiceWorker(reg);//for using the registered service worker
        var notificationPermission = false;
        if(Notification.permission === 'granted') {
            notificationPermission = true;
        }
	
        messaging.requestPermission() //FCM opens a pop up for getting the permission 
            .then(function () {
                targetWindow.postMessage({user: 'granted'}, '*');
                console.log('Notification permission granted.');
                return messaging.getToken() // for getting the current token 
                    .then(function (currentToken) {
                        if (currentToken && !notificationPermission) {
                            console.log('current_token:', currentToken);
                            subscriberDetails.token = currentToken;
			    // putting token into the localstorage.
                            window.localStorage.setItem('subs_token',currentToken);

                            getSubscriberDetails(); // for getting all the details of subscriber
                            subscriberPromise.then(function (res) { //sending the subscriber details to the api 
                                getUserSubscription().then(function(id){
                                    console.log(id,"vapid");
                                    subscriberDetails.vap_id = id;
                                    fetch("https://www.engageto.com:8081/v1/node/domains/subscribers", {
                                        method: 'post',
                                        headers: {
                                            "Content-type": "application/json"
                                        },
                                        body: JSON.stringify(res)
                                    }).then(function (response) {
                                        if (response.status !== 200) {// checks the response status is success or not 
                                            console.log('Looks like there was a problem. Status Code: ' + response.status);
                                            return;
                                        } else {// if success call the api and post subscriber token and subdomain_id 
                                            fetch("/userSubscribed", {
                                                method: 'post',
                                                headers: {
                                                    "Content-type": "application/json"
                                                },
                                                body: JSON.stringify({
                                                    subscriber_token: currentToken,
                                                    subdomain_id: subdomainid
                                                })
                                            }).then(function (response) {
                                                if (response.status !== 200) {
                                                    console.log('Looks like there was a problem. Status Code: ' + response.status);
                                                    return;
                                                } else {
                                                    console.log('Successfully sent welcome notification');
                                                }
                                            }).catch(function (err) {
                                                console.log('Fetch Error :-S', err);
                                            });
                                        }
                                    }).catch(function (err) {
                                        console.log('Fetch Error :-S', err);
                                    });
                                })
                                
                            }).catch(function (err) {
                                console.log('Handle rejected promise (' + err + ') here.');
                            });

                        } else {
                          // there is an error in token generation from fcm
                        }

                    }).catch(function (err) {//if messaging.gettoken is having error
                        console.log('An error occurred while retrieving token. ', err);
                    });
            })
            .catch(function (err) {// if messaging.permission is error
		var data = Notification.permission;
                targetWindow.postMessage({user: data}, '*');
                console.log('Unable to get permission to notify. ', err);
		if(window.opener) {
                    window.close();
               }
            });

        messaging.onMessage(function (payload) { //to recieve the messages on foreground also
            console.log('data received in onMessage: ', payload);
            var options = {
                body: payload.data.body,
                icon: payload.data.icon,
                actions: []
            };
           navigator.serviceWorker.ready.then(function(registration){//to wake up the service worker from foreground
             registration.showNotification(payload.data.title,options).then(function(success){
               console.log('notification display was succesfull');
               if(window.opener) {
		    window.close();
               }
             }).catch(function(failed){
               console.log('notification display was unsuccessfull');
               if(window.opener) {
                    window.close();
               }
             });
           }).catch(function(error){//if the service worker is not ready
             console.log('error comming while making service-worker ready');
           });
        });
    }).catch(function (err) {//if the service worker is not registered
        console.error("SW registration failed with error: " + err);
    });
}else{//if the browser does not support service worker
    console.log('Notification is not supported by this browser');
}
