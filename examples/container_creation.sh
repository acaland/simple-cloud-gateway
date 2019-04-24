
# Container creation
curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -H "Authorization: $TOKEN" -d '
    {  
        "name": "acaland" 
    }' $REMOTEURL/api/containers
