# NOSTRJS
Nostr smart inter-user synchronization.

## What is this?
NOSTRJS is another nostr client that acts like a regular client but has special capabilities for direct communication between users. This can help strengthen the nostr network with a chance to escape blocking system. Because blocking all nostr relays alone will not be enough to stop the network but also have to block all users.

## Why?

Relays are the backbone of the nostr network, responsible for storing events and distributing them across the network. If all public relays are blocked in an area, people in that area will not be able to access the global network. Even if it were possible to run relays within the area, this would create a local network that is separate from the global network. This project attempts to solve this problem with smart inter-user synchronization which is created using a user-to-user tunnel on the client side.