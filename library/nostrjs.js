import {
	mkErr
} from './utils'
import * as constants from  './constants'
import {webpeerjs} from 'webpeerjs'


class nostrjs{
	
	webpeer
	online
	
	constructor(webpeer){
		
		this.webpeer = webpeer
		this.online = 0
		
		this.webpeer.IPFS.libp2p.addEventListener('peer:identify', async (evt) => {
			if(evt.detail.protocols.includes(constants.CONSTANTS_PROTOCOL) && !evt.detail.connection.transient){
				console.log('peer:identify '+evt.detail.peerId.toString(),evt)
			}
		})
		
		const [broadcast,listen,members] = this.webpeer.joinRoom('_'+constants.CONSTANTS_PREFIX+'_')
		
		members((data)=>{
			this.online = data.length
		})
		
		this.#registerProtocol()
		
	}
	
	async #registerProtocol(){
		
		const handler = async ({ connection, stream }) => {
			const id = connection.remotePeer.toString()
			console.log('handler',id)
		}

		await this.webpeer.IPFS.libp2p.handle(constants.CONSTANTS_PROTOCOL, handler, {
		  maxInboundStreams: 100,
		  maxOutboundStreams: 100,
		  runOnTransientConnection:false
		})

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
		
		return new nostrjs(webpeer)
	}
	
}

export {nostrjs}
