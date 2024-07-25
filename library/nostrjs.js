import {
	mkErr
} from './utils'
import {webpeerjs} from 'webpeerjs'

class mkNostrRelays{
	constructor(){
	}
}

class nostrjs{
	
	constructor(){
	}
	
	static async createNostrDB(){
		
		let config = {}
		
		if(arguments.length > 0){
			const configuration = arguments[0]
			if(configuration.relays === undefined){
				throw mkErr('relay is required')
			}else{
				if(configuration.relays.length == 0){
					throw mkErr('relay is required')
				}
			}
			
			config = arguments[0]
			
		}
		
		const webpeer = await webpeerjs.createWebpeer(config)
		
		//const [broadcast,listen,members] = webpeer.joinRoom('_nostrjs_')
	}
	
}

export {nostrjs}
