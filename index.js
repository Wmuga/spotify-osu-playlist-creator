const spoty = require('.\\spotify_module.js')
const options = require('.\\options.json')
const { readdirSync } = require('fs')
const { DH_CHECK_P_NOT_PRIME } = require('constants')

const get_directories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

async function set_playlist(){
    console.log('Awaiting permissions')
    spoty.set_token_updater()
    await new Promise(resolve => setTimeout(resolve,3000))
    console.log('Creating playlist')
    let data = await spoty.get_user()
    let user_id = data['id']
    data = await spoty.create_playlist(user_id,'osu-playlist','Generated playlist from osu! songs')
    let playlist_id = data['id']
    console.log('Reading songs')
    let songs = get_directories(options.path)
    let not_found = []
    for(let song of songs){
        song = song.split(' ').slice(1).join(' ')
        song = song.split(/[^\d\w]+/).join(' ')
        console.log(`Searching ${song}`)
        data = await spoty.search_song(song)
        if (data['tracks']['items'].length>0){
            console.log(`${song} is added to playlist`)
            await spoty.add_to_playlist(playlist_id,data['tracks']['items'][0]['uri'])
        }else{
            not_found.push(song)
            console.log(`${song} cannot be found`)
        }
        await new Promise(resolve => setTimeout(resolve,100))
    }
    console.log('Successfully created playlist')
    console.log(`Not found: ${not_found.join(', ')}`)
    console.log('You can close this app')
}    

set_playlist()
