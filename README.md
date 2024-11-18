# Academic Knowledge Graph

This project is meant to demonstrate the use of web3 technology as a way to verify the integrity of data. I accomplish this by creating a knowledge graph of academic papers and metadata about them and then storing a hash of the graph in a Hedera smart contract. Every time the graph is updated, I update the hash in the smart contract and provide a timestamp of when the update occurred. To verify the integrity of the graph at any point in time, one can query the smart contract and verify that the hash stored in the contract matches the hash of the latest version of the graph.

## Running the project

To run the project, you need to set the `ACCOUNT_ID` and `PRIVATE_KEY` environment variables to your Hedera account ID and private key. You can get a Hedera testnet account [here](https://docs.hedera.com/hedera/getting-started/introduction).

Once you have your Hedera account, you can run the project by running `yarn` to install the dependencies and then `yarn dev` to start the project.

## How it works

The project consists of a Next.js app that serves as a frontend and a backend. The backend consists of a series of functions that interact with the Hedera network.
