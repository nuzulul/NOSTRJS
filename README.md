# NOSTRJS
Open source unstoppable nostr client through smart inter-user synchronization.

⚠️ This project is in early development

## What is this?
NOSTRJS is another nostr client that acts like a regular client but has special capabilities for direct communication between users. This can help strengthen the nostr network with a chance to escape blocking. Because blocking all nostr relays alone will not be enough to stop the network but also have to block all users.

## Why?

Relays are the backbone of the nostr network, responsible for storing events and distributing them across the network. If all public relays are blocked in an area, people in that area will not be able to access the global network. Even if it were possible to run relays within the area, this would create a local network that is separate from the global network. This project attempts to solve this problem with smart inter-user synchronization which is created using a user-to-user tunnel on the client side.

## Getting Started

NOSTRJS is a web application written in Vanilla JavaScript. Below is a step-by-step on how to get it started.

### Prerequisites

- Node and npm

### Installation

1. Clone the repo

```sh
git clone https://github.com/nuzulul/NOSTRJS.git
```

2. Install NPM packages

```sh
npm install
```

3. Start the app server

```sh
npm start
```

## License

MIT