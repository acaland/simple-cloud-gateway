HOSTNAME_APPID=5cc06835c7915a0d861f74b5

generate_post_data()
{
  cat <<EOF
{ 
   "appId": "$HOSTNAME_APPID", 
   "inputZipURL": "${REMOTEURL}/api/containers/acaland/download/hostname-inputs.zip" 
}
EOF
}



curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -H "Authorization: $TOKEN" -d "$(generate_post_data)" $REMOTEURL/api/jobs
