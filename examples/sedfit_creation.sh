generate_post_data()
{
  cat <<EOF
{ 
     "name": "SedFitCloud", 
     "description": "Running SedFitOnTheCloud", 
     "portmapping": "${REMOTEURL}/api/containers/acaland/download/sedfit-portmapping.txt", 
     "workflowURL": "${REMOTEURL}/api/containers/acaland/download/sedfit.xml", 
     "credentialId": "CESNET-VisIVO"
}
EOF
}

# echo "$(generate_post_data)"


curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -H "Authorization: $TOKEN" -d "$(generate_post_data)" $REMOTEURL/api/apps