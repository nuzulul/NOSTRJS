import {SimplePool} from 'nostr-tools/pool'

class nostrjsPOOL{
	
	pool
	#relays
	
	constructor(config){

		this.pool = new SimplePool()
		const me = this
		this.#relays = config.relays
		
		let h = this.pool.subscribeMany(
			this.#relays,
			[
				{
				  kinds:[0,1],
				},
			],
			{
				onevent(event) {
					me.#onEventFn(event)
				},
				oneose() {
				  h.close()
				}
			}			
		)

	}

	#onEventFn = () => {}
	onEvent = f => (this.#onEventFn = f)
	
	async publishEvent(event){
		await Promise.any(this.pool.publish(this.#relays, event))
	}
	
	static async createPOOL(config){
		return new nostrjsPOOL(config)
	}
}

export {nostrjsPOOL}
