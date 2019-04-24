generate_post_data()
{
  cat <<EOF
{ 
     "name": "Hostname", 
     "description": "Running hostname and df", 
     "portmapping": "${REMOTEURL}/api/containers/acaland/download/hostname-portmapping.txt", 
     "workflowURL": "${REMOTEURL}/api/containers/acaland/download/hostname.xml", 
     "credentialId": "CESNET-VisIVO"
}
EOF
}

# echo "$(generate_post_data)"


curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -H "Authorization: $TOKEN" -d "$(generate_post_data)" $REMOTEURL/api/apps