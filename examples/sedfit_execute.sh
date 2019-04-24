SEDFIT_APPID=5cc0683cc7915a0d861f74b6
CONTAINER=acaland

generate_post_data()
{
  cat <<EOF
{ 
   "appId": "$SEDFIT_APPID", 
   "inputs": [
        {
            "name": "execute.bin",
            "type": "URL",
            "value": "${REMOTEURL}/api/containers/${CONTAINER}/download/sedfit-execute.bin"
        },
        {
            "name": "fit_type",
            "type": "string",
            "value": "0"
        },
        {
            "name": "params",
            "type": "string",
            "value": "[350,250,160,70],[210.906,660.184,747.864,592.131],[4.84341,16.768,10.8736,27.4032],[1,1,1,1],7992.19,0.8,sed_weights=[1,1,1],use_wave=[350,250,160,70],outdir='./',delta_chi2=3"
        },
        {
            "name": "script_idl.tar",
            "type": "URL",
            "value": "${REMOTEURL}/api/containers/${CONTAINER}/download/script_idl.tar"
        },
        {
            "name": "vialactea_tap_sedfit_v7_nospawn.pro",
            "type": "URL",
            "value": "${REMOTEURL}/api/containers/${CONTAINER}/download/vialactea_tap_sedfit_v7_nospawn.pro"
        }
    ]
}
EOF
}



curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -H "Authorization: $TOKEN" -d "$(generate_post_data)" $REMOTEURL/api/jobs
