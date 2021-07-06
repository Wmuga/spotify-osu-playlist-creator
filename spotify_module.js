const req = require('request')
const http = require('http')
const crypto = require('crypto')
const opn = require('opn')
const base64url = require('base64url')
let app_code
let access_token_data
let client_id = "d0d24ad1b86d4b118e22790e4df89b1f"
let code_verifier = require('randomstring').generate(50)


function requestJson(_method,_url,_headers){
    let req_options = {
        method:_method,
        url:_url,
    }
    if (_headers) req_options.headers = _headers;
    return new Promise(resolve =>{
        req(req_options,async function(error, response,body){
            if (error) {
                console.log(error);
                body = await requestJson(_method,_url,_headers,_body);
                resolve(body);
            }
            resolve(JSON.parse(body))
        })
    });
}

function requestJsonWBody(_method,_url,_headers,_body){
    let req_options = {
        method:_method,
        headers: {
            "content-type": "application/json",
            },
        url:_url,
        body:JSON.stringify(_body),
    }
    if (_headers) req_options.headers = _headers;
    return new Promise(resolve =>{
        req(req_options,async function(error, response,body){
            resolve(JSON.parse(body))
        })
    });
}


function sha256_encode(str){
    let base64 = crypto.createHash('sha256').update(str).digest('base64')
    return base64url.fromBase64(base64)
}


function authorize(){
    const http_server = http.createServer(function(req,res){
        res.setHeader('Access-Control-Allow-Origin','*')
        let url_object = new URL(`http://localhost:4101${req.url}`)
        app_code = url_object.searchParams.get('code')
        switch (url_object.pathname){
            case '/callback':
                res.writeHead(200)
                res.end("<html><head></head><body><script>setTimeout(()=>{window.close()},1000)</script></body></html>")
                break;
            default:
                res.writeHead(404)
                res.end()
                break;
        }
        if (app_code) {
            http_server.close()
        }
    })
    http_server.listen(4101,'localhost',()=>{
        let scopes = 'playlist-modify-public'
        opn(encodeURI(`https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=code&redirect_uri=http://localhost:4101/callback&scope=${scopes}&code_challenge_method=S256&code_challenge=${sha256_encode(code_verifier)}`))
    })
}

function get_bearer_header(){
    return new Promise(async function(resolve){
        while(!access_token_data) await new Promise(resolve => setTimeout(resolve,100))
        resolve({
            "Authorization": `Bearer ${access_token_data['access_token']}`
        })
    })
    
}


function refresh_access_token(expires_in,refresh_token){
    return new Promise(async function(resolve){
        await new Promise(r => setTimeout(r,expires_in*1000))
        resolve(await requestJson('POST',`https://accounts.spotify.com/api/token?grant_type=refresh_token&refresh_token=${refresh_token}&client_id=${client_id}`),{"Content-Type":'application/x-www-form-urlencoded'})
    })
}

function get_token(){
    return requestJson('POST',`https://accounts.spotify.com/api/token?client_id=${client_id}&grant_type=authorization_code&code=${app_code}&redirect_uri=http://localhost:4101/callback&code_verifier=${code_verifier}`,{"Content-Type":'application/x-www-form-urlencoded'})
}

async function set_token_updater(){
    authorize()
    while(!app_code) await new Promise(resolve => setTimeout(resolve,1000))
    access_token_data = await get_token()
    let refresh_token = access_token_data['refresh_token']
    while(true){
        access_token_data = await refresh_access_token(access_token_data['expires_in'],refresh_token)
    }
}

async function get_user(){
    return requestJson('GET','https://api.spotify.com/v1/me',await get_bearer_header())
}

async function create_playlist(user_id,name,description){
    return requestJsonWBody('POST',`https://api.spotify.com/v1/users/${user_id}/playlists`,await get_bearer_header(),{
        'name':name,
        'description':description
    })
}

async function add_to_playlist(playlist_id,song_uri){
    return requestJsonWBody('POST',`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,await get_bearer_header(),{
        'uris':[song_uri]
    })
}

async function search_song(name){
    return requestJson('GET',`https://api.spotify.com/v1/search?q=${encodeURI(name)}&type=track&limit=1`,await get_bearer_header())
}

module.exports.add_to_playlist = add_to_playlist
module.exports.search_song = search_song
module.exports.create_playlist = create_playlist
module.exports.get_user = get_user
module.exports.set_token_updater = set_token_updater
