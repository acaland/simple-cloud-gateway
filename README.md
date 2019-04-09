# CAGE: Cloud for Astrophysics GatEways


## Overview

CAGE aims at providing scientific applications a minimalistic environment to access cloud resources from desktop, mobile, web apps, command line scripts, embedded devices or any client capable of using the HTTP protocol. CAGE just exposes a simple set of RESTful APIs to define pipelines and executing scientific workflows on any Clouds or HPC/HTC resources, hiding all the details of the underlying infrastructures.

The core of CAGE is made up of only 4 entities: **App**, **Job**, **Container** and **User**.

In CAGE terminology we use the term **App** to refer to any form of workflow that can be run on Cloud resources. An App is composed of its executables and any environment configuration setting that specifies where and how the app can be run. Once an app is defined, clients can create one or more **Job**s, instances of an app, each with its own set of input parameters and configuration. Through the **Job** APIs, it’s possible to monitor the job’s execution and retrieving  the final output. Input and output data needed for a given Job can be easily managed through the Files APIs.

Finally, a **User** API allows to create and associate users to each **App**. We believe that users belong to the institution offering the service and not to the infrastructure provider. With CAGE architecture, the institution that decides to deploy the CAGE service is the only actual infrastructure *user* and is in charge of obtaining the authorization to run jobs on the destination resources, providing simpler access mechanisms to its users. CAGE offers a built-in logging capabilities to track every request issued by its users. Moreover ACLs (Access Control Lists) can be defined for App, Job and Files, so that app developers can implement a granular permission sets.

All the four entities provide the usual 4 CRUD operations (Create, Read, Update, Delete) to operate with each of them, following the RESTful philosophy.

CAGE is an open source and community driven initiative and even if it is tailored to the Astrophysics community needs, it can be employed anywhere there is the need to get a simplified access to Cloud resources.

## Installation

CAGE requires Node.js and a Mongo DB server. The default configuration expects that MongoDB is installed in the same machine of the Node.js server.

To install CAGE, clone this repository:

```
  git clone https://github.com/acaland/simple-cloud-gateway

  cd simple-cloud-gateway
```

and install all the required Node.js packages. CAGE is built using the IBM Loopback.js v3 framework.

```
  npm install
```

Now you should be able to start CAGE with:

```
  node .
```

## Usage

### User creation

```
curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{ \
  \
   "username": "acaland", \
   "email": "antonio.calanducci%40inaf.it", \
   "password": "aSuperSecretPassword" \
 }' 'http://vialactea-sg.oact.inaf.it:3000/api/Users'
 ```


 ### User login

```
 curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{ \
  \
   "username": "acaland", \
   "password": "aSuperSecretPassword" \
 }' 'http://vialactea-sg.oact.inaf.it:3000/api/Users/login'
```

If the login is successful, it will return a valid token in the `id` field, to be used for all the other API requests:

```
{
  "id": "GhzxC123Vpe6AJnMsovTdhTIs6xon8ErwB89McG5OO4R7NL6E9fjLRCQc1qs9Kza",
  "ttl": 1209600,
  "created": "2019-04-05T14:25:26.105Z",
  "userId": 1
}
```

You can pass the token to the API request both in the query string (`?access_token=GhzxC123Vpe6AJnMsovTdhTIs6xon8ErwB89McG5OO4R7NL6E9fjLRCQc1qs9Kza`)

or as an HTTP header.

### App creation

```
curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{ \
     "name": "Hostname", \
     "description": "Running hostname and df", \
     "portmapping": "http://vialactea-sg.oact.inaf.it:3000/api/containers/acaland/download/4714ca96-c2ac-485b-a13b-964326466da6.txt", \
     "workflowURL": "http://vialactea-sg.oact.inaf.it:3000/api/containers/acaland/download/810ef73b-64b8-49b0-a539-f00847a82e25.xml", \
     "credentialId": "CESNET-VisIVO", \
     "owner": "acaland" \
   }' 'http://vialactea-sg.oact.inaf.it:3000/api/apps?access_token=GhzxC123Vpe6AJnMsovTdhTIs6xon8ErwB89McG5OO4R7NL6E9fjLRCQc1qs9Kza'
```

It will return an `appID`, you can use to create **Jobs**:

```
{
  "name": "Hostname",
  "description": "Running hostname and df",
  "portmapping": "http://vialactea-sg.oact.inaf.it:3000/api/containers/acaland/download/4714ca96-c2ac-485b-a13b-964326466da6.txt",
  "workflowURL": "http://vialactea-sg.oact.inaf.it3000/api/containers/acaland/download/810ef73b-64b8-49b0-a539-f00847a82e25.xml",
  "credentialId": "CESNET-VisIVO",
  "owner": "acaland",
  "id": "5ca766552e58085bd7706f25"
}
```

### Job creation

```
curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{ \
   "appId": "5ca766552e58085bd7706f25", \
   "inputZipURL": "http://vialactea-sg.oact.inaf.it:3000/api/containers/acaland/download/1b1e28ae-e02b-40a7-bdf4-8089863c7569.zip" \
 }' 'http://vialactea-sg.oact.inaf.it:3000/api/jobs?access_token=GhzxC123Vpe6AJnMsovTdhTIs6xon8ErwB89McG5OO4R7NL6E9fjLRCQc1qs9Kza'
 ```

 Response:

 ```
 {
  "jobId": 155447480463636,
  "appId": "5ca766552e58085bd7706f25",
  "submissionDate": "2019-04-05T14:33:25.039Z",
  "inputZipURL": "http://vialactea-sg.oact.inaf.it:3000/api/containers/acaland/download/1b1e28ae-e02b-40a7-bdf4-8089863c7569.zip",
  "status": "submitted"
}
```



### Job monitoring


```
curl -X GET --header 'Accept: application/json' 'http://vialactea-sg.oact.inaf.it:3000/api/jobs/155447480463636?access_token=GhzxC123Vpe6AJnMsovTdhTIs6xon8ErwB89McG5OO4R7NL6E9fjLRCQc1qs9Kza'

```

Response Body
```
{
  "jobId": 155447480463636,
  "appId": "5ca766552e58085bd7706f25",
  "submissionDate": "2019-04-05T14:33:25.039Z",
  "inputZipURL": "http://vialactea-sg.oact.inaf.it:3000/api/containers/acaland/download/1b1e28ae-e02b-40a7-bdf4-8089863c7569.zip",
  "status": "running"
}
```


### Job Output

```
curl -X GET --header 'Accept: application/json' 'http://vialactea-sg.oact.inaf.it:3000/api/jobs/155447480463636/getOutput?access_token=GhzxC123Vpe6AJnMsovTdhTIs6xon8ErwB89McG5OO4R7NL6E9fjLRCQc1qs9Kza'
```

If the job is still running it will return:

```
{
  "error": {
    "statusCode": 404,
    "message": "Job status running"
  }
}
```

Otherwise it will send a *output.zip* as attachment.


### Files upload

```
curl -X POST -F file=@package.json 'http://vialactea-sg.oact.inaf.it:3000/api/containers/acaland/upload'
```

It returns:

```
{
  "result": {
    "files": {
      "file": [{
        "container": "acaland",
        "name": "bb71487d-0351-49c1-82d4-0eb0a4cbe439.json",
        "type": "application/octet-stream",
        "field": "file",
        "originalFilename": "package.json",
        "size": 848
      }]
    },
    "fields": {}
  }
}
```

You can later download the same file at:

```
http://vialactea-sg.oact.inaf.it:3000/api/containers/acaland/download/bb71487d-0351-49c1-82d4-0eb0a4cbe439.json
```
