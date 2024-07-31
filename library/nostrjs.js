import {
	mkErr,
	pipe,
	lp,
	map,
	uint8ArrayToString,
	uint8ArrayFromString,
	mkDebug
} from './utils'
import * as constants from  './constants'
import {webpeerjs} from 'webpeerjs'
import {SimplePool} from 'nostr-tools/pool'
import {createStore} from 'tinybase'
import {createIndexedDbPersister} from 'tinybase/persisters/persister-indexed-db'
import * as Y from 'yjs'
import {createYjsPersister} from 'tinybase/persisters/persister-yjs'

class nostrjs{
	
	webpeer
	online
	
	#nostrjsDial
	#nostrjsRun
	#store
	#persister
	
	constructor(webpeer,store,persister){
		
		this.webpeer = webpeer
		this.online = 0
		
		this.#nostrjsDial =  new Map()
		this.#nostrjsRun = false
		this.#store = store
		this.#persister = persister
		
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
		
		members((data)=>{
			this.online = data.length
		})
		
		this.#registerProtocol()
		
		const pool = new SimplePool()
		
		let h = pool.subscribeMany(
			constants.CONSTANTS_RELAYS,
			[
				{
				  //authors: ['32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'],
				},
			],
			{
				onevent(event) {
				  //console.log(event)
				},
				oneose() {
				  h.close()
				}
			}			
		)

		//const persister = createIndexedDbPersister(this.#store, 'nostrjs')
		this.#store.setValue(this.webpeer.id, 'ok');
		//this.#store.setCell('t1', 'r1', 'c1', 'World');
		//console.log(this.#store.getValue('v1') + ' ' + this.#store.getCell('t1', 'r1', 'c1'))
		//console.log('getValues()',this.#store.getValues())
		//console.log('getTables()',this.#store.getTables())
		
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
					const doc = new Y.Doc()
					const persister = createYjsPersister(this.#store, doc)
					await persister.save()
					//console.log('doc',doc.toJSON())
					const state = await Y.encodeStateAsUpdate(doc)
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
			
			const doc = new Y.Doc()
			const state = output
			
			const persister = createYjsPersister(this.#store, doc)
			await persister.startAutoLoad()
			await persister.startAutoSave()			
			await Y.applyUpdate(doc, state)
			
			//console.log('outputdial',doc.toJSON())
			console.log('getValues() new',this.#store.getValues())
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
				throw mkErr('relay is required')
			}else{
				if(configuration.relays.length == 0){
					throw mkErr('relay is required')
				}
			}
			
			config = arguments[0]
			
		}
		
		const webpeer = await webpeerjs.createWebpeer(config)
		
		const store = createStore()
		const persister = createIndexedDbPersister(store, 'nostrjs')
		await persister.load()
		await persister.startAutoSave()
		
		return new nostrjs(webpeer,store,persister)
	}
	
}

export {nostrjs}
