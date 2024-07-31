import {
	mkErr,
	pipe,
	lp,
	map,
	uint8ArrayToString,
	uint8ArrayFromString
} from './utils'
import * as constants from  './constants'
import {webpeerjs} from 'webpeerjs'


class nostrjs{
	
	webpeer
	online
	
	#nostrjsDial
	#nostrjsRun
	
	constructor(webpeer){
		
		this.webpeer = webpeer
		this.online = 0
		
		this.#nostrjsDial =  new Map()
		this.#nostrjsRun = false
		
		this.webpeer.IPFS.libp2p.addEventListener('peer:identify', async (evt) => {
			if(evt.detail.protocols.includes(constants.CONSTANTS_PROTOCOL) && !evt.detail.connection.transient){
				//console.log('peer:identify '+evt.detail.peerId.toString(),evt)
				//console.log('peer:identify '+evt.detail.peerId.toString(),evt.detail.observedAddr.toString())
				if(!this.#nostrjsDial.has(evt.detail.peerId.toString())){
					this.#nostrjsDial.set(evt.detail.peerId.toString(),evt.detail.peerId)
					if(!this.#nostrjsRun){
						this.#nostrjsRun = true
						console.log('runqueue')
						this.#nostrjsQueue()
					}
				}
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
			const message = 'sync'
			const id = connection.remotePeer.toString()
			console.log('handler',id)
			try{
				const output = await pipe(
					stream.source,
					(source) => lp.decode(source),
					(source) => map(source, (buf) => uint8ArrayToString(buf.subarray())),
					async function (source) {
					  let string = ''
					  for await (const msg of source) {
						string += msg.toString()
					  }
					  return string
					}
				)
				//console.log('outputhandler',output)
				pipe(
					message,
					(source) => map(source, (string) => uint8ArrayFromString(string)),
					(source) => lp.encode(source),
					stream.sink
				)
			}catch(err){
				console.log('err',err)
			}
		}

		await this.webpeer.IPFS.libp2p.handle(constants.CONSTANTS_PROTOCOL, handler, {
		  maxInboundStreams: 100,
		  maxOutboundStreams: 100,
		  runOnTransientConnection:false
		})

	}
	
	#nostrjsQueue(){
		for(const nostrjs of this.#nostrjsDial){
			const id = nostrjs[0]
			const peersId = nostrjs[1]
			if(peersId){
				this.#nostrjsDial.set(id,false)
				console.log('dialprotocol')
				this.#nostrjsDialProtocol(peersId)
				return
			}
		}
		this.#nostrjsRun = false
	}
	
	async #nostrjsDialProtocol(peersId){
		console.log('dial',peersId.toString())
		const message = 'sync'
		try{
			const stream = await this.webpeer.IPFS.libp2p.dialProtocol(peersId, constants.CONSTANTS_PROTOCOL,{runOnTransientConnection:false})
			const output = await pipe(
				message,
				(source) => map(source, (string) => uint8ArrayFromString(string)),
				(source) => lp.encode(source),
				stream,
				(source) => lp.decode(source),
				(source) => map(source, (buf) => uint8ArrayToString(buf.subarray())),
				async function (source) {
				  let string = ''
				  for await (const msg of source) {
					string += msg.toString()
				  }
				  return string
				}
			)
			console.log('outputdial',output)
		}catch(err){
			console.log('err',err)
		}
		console.log('this.#nostrjsDialed',this.#nostrjsDial)
		this.#nostrjsQueue()
	}
	
	static async createNostrClient(){
		
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
