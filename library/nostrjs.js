import {
	mkErr,
	pipe,
	lp,
	map,
	uint8ArrayToString,
	uint8ArrayFromString,
	mkDebug
} from './utils.js'
import * as constants from  './constants.js'
import {nostrjsDB} from './db.js'
import {nostrjsPOOL} from './pool.js'
import {webpeerjs} from 'webpeerjs'


class nostrjs{
	
	webpeer
	online
	
	#nostrjsDial
	#nostrjsRun
	#db
	#store
	#pool
	#broadcast
	#bufferNewEvents
	
	constructor(webpeer,db,pool){
		
		this.webpeer = webpeer
		this.online = 0
		
		this.#nostrjsDial =  new Map()
		this.#nostrjsRun = false
		this.#db = db
		this.#store = db.store
		this.#pool = pool
		this.#bufferNewEvents = []
		
		this.webpeer.IPFS.libp2p.addEventListener('peer:identify', async (evt) => {
			if(evt.detail.protocols.includes(constants.CONSTANTS_PROTOCOL) && !evt.detail.connection.transient){
				//console.log('peer:identify '+evt.detail.peerId.toString(),evt)
				//console.log('peer:identify '+evt.detail.peerId.toString(),evt.detail.observedAddr.toString())
				if(!this.#nostrjsDial.has(evt.detail.peerId.toString())){
					this.#nostrjsDial.set(evt.detail.peerId.toString(),evt.detail.peerId)
					if(!this.#nostrjsRun){
						this.#nostrjsRun = true
						//console.log('runqueue')
						this.#nostrjsQueue()
					}
				}
			}
		})
		
		const [broadcast,listen,members] = this.webpeer.joinRoom('_'+constants.CONSTANTS_PREFIX+'_')
		
		this.#broadcast = broadcast
		
		listen((data)=>{
			for(const event of data){
				if(!this.#db.hasEvent(event.id)){
					this.#db.addEvent(event)
					this.#pool.publishEvent(event)
				}
			}
		})
		
		members((data)=>{
			this.online = data.length
		})
		
		this.#registerProtocol()
		
		this.#pool.onEvent((event)=>{
			if(!this.#db.hasEvent(event.id)){
				this.#db.addEvent(event)
				this.#bufferNewEvents.push(event)
			}
		})
		
		setInterval(()=>{
			if(this.#bufferNewEvents.length>0 && this.online > 1){
				//const data = this.#bufferNewEvents.splice(0,50)
				//console.log('size',new Blob([JSON.stringify(data)]).size)
				//this.#broadcast(data)
				
				let data = []
				
				const limit = 75*1024
				while(true){
					const event = this.#bufferNewEvents.shift()
					data.push(event)
					const size = new Blob([JSON.stringify(data)]).size
					if(size > limit){
						if(data.length > 1){
							data.splice(-1)
							this.#bufferNewEvents.unshift(event)
							this.#broadcast(data)
						}else{
							//console.log('skip',data)
						}
						return
					}else{
						if(this.#bufferNewEvents.length == 0){
							if(data.length>0){
								this.#broadcast(data)
							}
							return
						}
					}

				}
			}
		},5000)
		
	}
	
	async #registerProtocol(){
		
		const handler = async ({ connection, stream }) => {
			
			let message = 'ok'
			const id = connection.remotePeer.toString()
			//console.log('handler',id)
			
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
				if(output === 'sync'){
					const state = await this.#db.getStoreState()
					pipe(
						[state],
						(source) => lp.encode(source),
						stream.sink
					)
				}
			}catch(err){
				mkDebug(err)
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
				//console.log('dialprotocol')
				this.#nostrjsDialProtocol(peersId)
				return
			}
		}
		this.#nostrjsRun = false
	}
	
	async #nostrjsDialProtocol(peersId){
		//console.log('dial',peersId.toString())
		const message = 'sync'
		try{
			const stream = await this.webpeer.IPFS.libp2p.dialProtocol(peersId, constants.CONSTANTS_PROTOCOL,{runOnTransientConnection:false})
			const output = await pipe(
				message,
				(source) => map(source, (string) => uint8ArrayFromString(string)),
				(source) => lp.encode(source),
				stream,
				(source) => lp.decode(source),
				async function (source) {
					for await (const data of source) {
						const body = data.subarray()
						return body
					}
				}
			)
			

			const state = output
			
			await this.#db.setStoreState(state)

			//console.log('getValues() new',this.#store.getValues())
			//console.log('getTables() new',this.#store.getTables())
			
		}catch(err){
			mkDebug(err)
		}
		//console.log('this.#nostrjsDialed',this.#nostrjsDial)
		this.#nostrjsQueue()
	}
	
	static async createNostrClient(){
		
		let config = {}
		
		if(arguments.length > 0){
			const configuration = arguments[0]
			if(configuration.relays === undefined){
				throw mkErr('Relay is required')
			}else{
				if(configuration.relays.length == 0){
					throw mkErr('Minimal 1 relay is required')
				}
			}
			
			config = arguments[0]
			
		}else{
			throw mkErr('Relay is required')
		}
		
		const webpeer = await webpeerjs.createWebpeer(config)
		
		const db = await nostrjsDB.createDB()
		
		const pool = await nostrjsPOOL.createPOOL(config)
		
		return new nostrjs(webpeer,db,pool)
	}
	
}

export {nostrjs}
