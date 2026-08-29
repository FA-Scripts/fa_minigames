fx_version 'cerulean'
game 'gta5'

name 'fa_minigames'
author 'FA Scripts | fa-scripts.tebex.io'
description 'Free, framework-independent NUI minigames for FiveM.'
version '1.0.0'
lua54 'yes'

ui_page 'web/dist/index.html'

files {
    'web/dist/index.html',
    'web/dist/assets/*'
}

shared_scripts {
    'config.lua',
    'locales/*.lua'
}
client_script 'client/main.lua'
