curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
   "username": "acaland", 
   "email": "antonio.calanducci@inaf.it", 
   "password": "aSuperSecretPassword" 
 }' $REMOTEURL/api/Users