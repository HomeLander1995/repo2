// node particle.network.share.js <NUMBER_OF_TXS> <CREDENTIAL_START_INDEX> <CREDENTIAL_END_INDEX>
const ethers = require("ethers");
const { createHash } = require('crypto');
const axios = require("axios");
axios.defaults.timeout = 90000;
const Captcha = require('@2captcha/captcha-solver');
const { v4: uuidv4 } = require('uuid');
const solver = new Captcha.Solver("5b51bedcf6c4b81fa933341224d39b47");

const { HttpsProxyAgent } = require("https-proxy-agent");
// REF CODE: https://pioneer.particle.network?inviteCode=HZTCMR
const targetChainId = 97;// Bsc testnet: 97, Sepolia: 11155111
let valueToSend = 0.0001;
let checkedIn = false;
let txSuccess = [];
let credentials = [
	{
		privateKey: '0x00000000', 
		proxy: 'username:password@ip:port',
	},
];
let aaWalletAddress = null;
const AbiCoder = new ethers.AbiCoder();
let proxyAgent = null;
// successMaxCnt from argument
let successMaxCnt = parseInt(process.argv[2]) || 100;
// credentialStartIdx from argument
let credentialStartIdx = parseInt(process.argv[3]) || 0;
// credentialEndIdx from argument
let credentialEndIdx = parseInt(process.argv[4]) || credentials.length;
if (credentialEndIdx > credentials.length) {
	credentialEndIdx = credentials.length - 1;
}

function randomNumberRange(min, max) {
	let _num = Math.floor(Math.random() * (max - min + 1) + min);
	return _num;
}
function getRandomArrayItem(arr) {
	try {
		return arr[Math.floor(Math.random() * arr.length)];
	} catch (e) {}
	return arr;
}

function sortObjectByKeys(object, {desc = false} = {}) {
	return Object.fromEntries(
		Object.entries(object).sort(([k1], [k2]) => k1 < k2 ^ desc ? -1 : 1),
	)
} 

function getTodayData(_data) {
	let today = new Date().toISOString().slice(0, 10);
	console.log('TODAY POINTS:', today);
	let _todayData = [];
	for (let i = 0; i < _data.length; i++) {
		if (_data[i].typeKey == today) {
			_todayData.push(_data[i]);
		}
	}
	// console.log(new Date().toLocaleString() + ': Today data =========================================');
	for (let i = 0; i < _todayData.length; i++) {
		console.log('---------------------------------------------------------');
		console.log('\x1b[32m%s\x1b[0m', `Type: ${_todayData[i].type}`, '\x1b[0m');
		console.log('\x1b[32m%s\x1b[0m', `Point: ${_todayData[i].point}`, '\x1b[0m');
		console.log('---------------------------------------------------------');
	}
}
/**
 * Send request to Particle API
 * Url: https://pioneer-api.particle.network/users
 * Additional URL params generated by buildRequestParams
 * Headers: Authorization: Basic OUMzUnRxQmNCcUJuQk5vYjo3RGJubng3QlBxOENBOFBI
 * @param {Object} {"loginMethod":"evm_wallet","loginSource":"metamask","loginInfo":{"address":"<wallet_address>","signature":"<signature>"} 
 */
async function loginToParticle(params, deviceId) {
	try {
		const urlParams = buildRequestParams({
			"device_id": deviceId, 
			"mac_key": createHash('sha256').update('9C3RtqBcBqBnBNob7Dbnnx7BPq8CA8PH').digest('hex').toLocaleLowerCase()//username+password
		}, params);
		const url = 'https://pioneer-api.particle.network/users?' + urlParams;
		const response = await axios.post(url, params, {
			headers: {
				"Authorization": "Basic OUMzUnRxQmNCcUJuQk5vYjo3RGJubng3QlBxOENBOFBI"
			},
			timeout: 90000
		});
		return response.data;
	}
	catch (error) {
		console.error(error);
	}
	return null;
}

async function getNewProxy() {
	console.log(new Date().toLocaleString() + ': Getting new proxy...');
	try {
		const response = await axios.get('https://proxy.mkvn.net/sp07v2/37019-XGCSYDEBCL.php', {timeout: 90000});
		if (response.data.toString().indexOf('da doi ip moi thanh cong') > -1) {
			return true;
		}
		console.log(response.data);
	}
	catch (error) {
		console.error(error);
	}
	return false;
}
// Authorization Bearer B4EcDK2FcAovMlyIhnsC6eEFR5Sv2B7RvnNveENF
// function buildRequestParams(_objParams) {
// 	let baseParams = {
// 		"device_id": uuidv4(),//"b7a2a03c-326e-44fd-9c92-18e348d35d71",
// 		"mac_key": "gNFdMoRbmAXVazasIZhLyyeYODMejDfmFpFv73uS",
// 		"project_app_uuid": "79df412e-7e9d-4a19-8484-a2c8f3d65a2e",
// 		"project_client_key": "cOqbmrQ1YfOuBMo0KKDtd15bG1ENRoxuUa7nNO76",
// 		"project_uuid": "91bf10e7-5806-460d-95af-bef2a3122e12",
// 		"random_str": uuidv4(),
// 		"sdk_version": "web_1.0.0",
// 		"timestamp": Math.floor(Date.now() / 1e3)
// 	};
// 	let _params = Object.assign(baseParams, _objParams);
// 	// Sort by key
// 	let ordered = sortObjectByKeys(_params);
// 	// SHA256 hash of the json string
// 	let _json = JSON.stringify(ordered);
// 	let _hash = createHash('sha256').update(_json).digest('hex');
// 	ordered['mac'] = _hash;
// 	// Convert to url params
// 	let _urlParams = new URLSearchParams(ordered).toString();
// 	return _urlParams;
// }
function buildRequestParams(_objParams, params = {}, macKey = null) {
	let baseParams = {
		"project_app_uuid": "79df412e-7e9d-4a19-8484-a2c8f3d65a2e",
		"project_client_key": "cOqbmrQ1YfOuBMo0KKDtd15bG1ENRoxuUa7nNO76",
		"project_uuid": "91bf10e7-5806-460d-95af-bef2a3122e12",
		"random_str": uuidv4(),
		"sdk_version": "web_1.0.0",
		"timestamp": Math.floor(Date.now() / 1e3)
	};
	let paramsForUrl = Object.assign(baseParams, _objParams);
	let _params = Object.assign({}, paramsForUrl, params);
	// Sort by key
	let ordered = {};
	if (macKey) {
		ordered = sortObjectByKeys(Object.assign({"mac_key": macKey}, _params));
	}
	else {
		ordered = sortObjectByKeys(_params);
	}
	// SHA256 hash of the json string
	let _json = JSON.stringify(ordered);
	let _hash = createHash('sha256').update(_json).digest('hex').toLocaleLowerCase();
	paramsForUrl['mac'] = _hash;
	// Convert to url params
	let _urlParams = new URLSearchParams(paramsForUrl).toString();
	return _urlParams;
}

function randomString(length) {
	let result = "";
	let characters =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let charactersLength = characters.length;
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

async function checkStreakTx(token, macKey, deviceId) {
	// POST to `https://pioneer-api.particle.network/streaks/streak_tx`
	try {
		let _params = buildRequestParams({
			"device_id": deviceId,
			"mac_key": macKey
		});
		const checkTxPoint = await axios.post(
			"https://pioneer-api.particle.network/streaks/streak_tx?" + _params,
			{},
			{
				headers: {
					"Authorization": "Bearer " + token
				},
				timeout: 90000
			}
		);
		return checkTxPoint.data;
	}
	catch (e) {
		console.log(e);
	}
	return null;
}

async function checkTxPoint(token, macKey, deviceId) {
	// POST to `https://pioneer-api.particle.network/users/check_tx_point`
	try {
		let _params = buildRequestParams({
			"device_id": deviceId,
			"mac_key": macKey
		});
		const checkTxPoint = await axios.post(
			"https://pioneer-api.particle.network/users/check_tx_point?" + _params,
			{},
			{
				headers: {
					"Authorization": "Bearer " + token
				},
				timeout: 90000
			}
		);
		return checkTxPoint.data;
	}
	catch (e) {
		console.log(e);
	}
	return null;
}

async function turnstileSolver(siteKey, url, proxy = null) {
	console.log(new Date().toLocaleString() + ": Solving turnstile..." + proxy);
	try {
		// 2captcha solver
		// cfSovler = await solver.cloudflareTurnstile({
		// 	pageurl: url,
		// 	sitekey: siteKey   
		// });
		// return cfSovler.data;
		
		// Turnaround local solver (https://github.com/Euro-pol/turnaround-api)
		const turnaroundSolver = await axios.post(
			"http://127.0.0.1:5000/solve",
			{
				"sitekey": siteKey,
				"url": url,
				"invisible": false,
				"proxy": proxy,//username@password:ip:port
			},
			{timeout: 90000}
		);
		console.log(new Date().toLocaleString() + ": Turnstile solved");
		return turnaroundSolver.data.token;
	}
	catch (e) {
		console.log(e);
	}
	return null;
}

async function getPointHistory(token, macKey, deviceId)  {
	// Send GET to : https://pioneer-api.particle.network/users/point_records
	try {
		let _params = buildRequestParams({
			"page": "1",
			"count": "100",
			"device_id": deviceId,
			"mac_key": macKey,
			"random_str": uuidv4()
		});
		const _pointHistory = await axios.get(
			"https://pioneer-api.particle.network/users/point_records?" + _params,
			{
				headers: {
					"Authorization": "Bearer " + token,
				},
				timeout: 90000
			}
		);
		return _pointHistory.data;
	}
	catch (e) {
		console.log(e);
	}
	return null;
}

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createCrossChainUserOperation(from, to, data, value = 0, chainId = 97, gasLimit = 21000, gasPrice = 5000000000, type = null, ownerAddress = null) {
	console.log(
		new Date().toLocaleString() + `: Creating cross chain user operation from ${from}...`
	);
	try {
		let blockchainParams = null;
		if (data == '0x183ff085') {
			blockchainParams = {
				chainId: chainId,
				data: data,
				to: to,
			};
		}
		else {
			blockchainParams = {
				from: from,
				to: to,
				value: ethers.toBeHex((value * 1e18).toString()),
				gasLimit: ethers.toBeHex(gasLimit.toString()),
				action: "normal",
				data: data,
				gasLevel: "high",
				gasPrice: ethers.toBeHex(gasPrice.toString()),
				gas: ethers.toBeHex(gasLimit.toString()),
			};
		}
		if (type) {
			blockchainParams.type = type;
		}
		const crossChainUserOperation = await axios.post(
			"https://universal-api.particle.network/",
			{
				jsonrpc: "2.0",
				chainId: chainId,
				method: "universal_createCrossChainUserOperation",
				params: [
					{
						name: "UNIVERSAL",
						version: "1.0.0",
						biconomyApiKey: "u7F_1lHe5.f9c588e6-96d6-4965-bc33-03f96fa05387",
						ownerAddress: (ownerAddress ? ownerAddress : from),
					},
					[
						blockchainParams
					],
				],
			},
			{timeout: 90000}
		);
		return crossChainUserOperation;
	}
	catch (e) {
		console.log(e);
		if (typeof crossChainUserOperation != 'undefined') {
			console.log(crossChainUserOperation.data);
		}
	}
	return null;
}

async function createMultiChainUnsignedData(params, walletAddress, chainId = 97) {
	try {
		let _data = {
			jsonrpc: "2.0",
			id: 3,
			method: "particle_aa_createMultiChainUnsignedData",
			params: [
				{
					name: "UNIVERSAL",
					version: "1.0.0",
					biconomyApiKey: "u7F_1lHe5.f9c588e6-96d6-4965-bc33-03f96fa05387",
					ownerAddress: walletAddress,
				},
				{
					multiChainConfigs: params,
				},
			],
		};
		const createMultiChainUnsignedData = await axios.post(
			"https://rpc.particle.network/evm-chain?chainId=97&projectUuid=772f7499-1d2e-40f4-8e2c-7b6dd47db9de&projectKey=ctWeIc2UBA6sYTKJknT9cu9LBikF00fbk1vmQjsV",
			_data,
			{timeout: 90000}
		);
		return createMultiChainUnsignedData;
	}
	catch (e) {
		console.log(e);
	}
	return null;
}

async function sendCrossChainUserOperation(crossChainUserOperation, signature0, signature1, chainId = 97, aaWalletAddress, proxy = null) {
	console.log(new Date().toLocaleString() + ': Sending cross chain user operation from ['+aaWalletAddress+'] to chain ['+chainId+']...')
	try {
		const tunrstileToken = await turnstileSolver(
			"0x4AAAAAAAaHm6FnzyhhmePw", 
			"https://core.particle.network/cloudflare.html?language=en&theme=light&_=0.1.1&siteKey=0x4AAAAAAAaHm6FnzyhhmePw",
			proxy
		);
		if (!tunrstileToken) {
			console.log("\x1b[31m%s\x1b[0m", `turnstileSolver failed`, '\x1b[0m');
			return null;
		}
		let params = [
			[
				{
					sender: aaWalletAddress,
					nonce: crossChainUserOperation.data.result.userOps[0].userOp.nonce,
					initCode: "0x",
					callData:
					crossChainUserOperation.data.result.userOps[0].userOp.callData,
					paymasterAndData:
					crossChainUserOperation.data.result.userOps[0].userOp
					.paymasterAndData,
					signature: signature0,
					preVerificationGas:
					crossChainUserOperation.data.result.userOps[0].userOp
					.preVerificationGas,
					verificationGasLimit:
					crossChainUserOperation.data.result.userOps[0].userOp
					.verificationGasLimit,
					callGasLimit:
					crossChainUserOperation.data.result.userOps[0].userOp
					.callGasLimit,
					maxFeePerGas:
					crossChainUserOperation.data.result.userOps[0].userOp
					.maxFeePerGas,
					maxPriorityFeePerGas:
					crossChainUserOperation.data.result.userOps[0].userOp
					.maxPriorityFeePerGas,
					chainId: chainId,
				},
				{
					sender: aaWalletAddress,
					nonce: crossChainUserOperation.data.result.userOps[1].userOp.nonce,
					initCode: "0x",
					callData:
					crossChainUserOperation.data.result.userOps[1].userOp.callData,
					paymasterAndData:
					crossChainUserOperation.data.result.userOps[1].userOp
					.paymasterAndData,
					signature: signature1,
					preVerificationGas:
					crossChainUserOperation.data.result.userOps[1].userOp
					.preVerificationGas,
					verificationGasLimit:
					crossChainUserOperation.data.result.userOps[1].userOp
					.verificationGasLimit,
					callGasLimit:
					crossChainUserOperation.data.result.userOps[1].userOp
					.callGasLimit,
					maxFeePerGas: crossChainUserOperation.data.result.userOps[1].userOp.maxFeePerGas,
					maxPriorityFeePerGas: crossChainUserOperation.data.result.userOps[1].userOp.maxPriorityFeePerGas,
					chainId: 2011,
				},
			],
		];
		let _proxyAgent = null;
		if (proxy) {
			_proxyAgent = new HttpsProxyAgent("http://" + proxy);
		}
		const crossChainUserOperationData = await axios.post(
			"https://universal-api.particle.network/",
			{
				jsonrpc: "2.0",
				chainId: chainId,
				method: "universal_sendCrossChainUserOperation",
				cfTurnstileResponse: tunrstileToken,
				params: params
			},
			{httpsAgent: _proxyAgent}
		);
		return crossChainUserOperationData;
	}
	catch (e) {
		console.log(e);
	}
	return null;
}

/*
TX: chainId: 11155420
data: "0x183ff085"
to: "0x4BD0b3b6325676644B7E8091C1683DF3092E14d9"
*/
async function checkInDaily(_aaWalletAddress, _ownerAddress, signer, proxy = false) {
	console.log(new Date().toLocaleString() + ": Checking in daily...");
	const _targetChainId = 11155420;
	try {
		const crossChainUserOperation = await createCrossChainUserOperation(
			_ownerAddress,
			"0x4BD0b3b6325676644B7E8091C1683DF3092E14d9",
			"0x183ff085",
			0,
			_targetChainId
		);
		let validAfter = Math.floor(Date.now() / 1e3) - 600;
		let validUntil = Math.floor(Date.now() / 1e3) + 600;
		const multiChainUnsignedData = await createMultiChainUnsignedData(
			[
				{
					chainId: 11155420,
					userOpHash: crossChainUserOperation.data.result.userOps[0].userOpHash,
					validUntil: validUntil,
					validAfter: validAfter,
				},
				{
					chainId: 2011,
					userOpHash: crossChainUserOperation.data.result.userOps[1].userOpHash,
					validUntil: validUntil,
					validAfter: validAfter,
				}
			],
			_ownerAddress,
			11155420
		);
		const signedData = await signer.signMessage(
			ethers.toBeArray(multiChainUnsignedData.data.result.merkleRoot)
		);
		const signature0 = AbiCoder.encode(
			["bytes", "address"],
			[
				AbiCoder.encode(
					["uint48", "uint48", "bytes32", "bytes32[]", "bytes"],
					[
						multiChainUnsignedData.data.result.data[0].validUntil,
						multiChainUnsignedData.data.result.data[0].validAfter,
						multiChainUnsignedData.data.result.merkleRoot,
						multiChainUnsignedData.data.result.data[0].merkleProof,
						signedData,
					]
				),
				"0x1965cd0Bf68Db7D007613E79d8386d48B9061ea6",
			]
		);
		const signature1 = AbiCoder.encode(
			["bytes", "address"],
			[
				AbiCoder.encode(
					["uint48", "uint48", "bytes32", "bytes32[]", "bytes"],
					[
						multiChainUnsignedData.data.result.data[1].validUntil,
						multiChainUnsignedData.data.result.data[1].validAfter,
						multiChainUnsignedData.data.result.merkleRoot,
						multiChainUnsignedData.data.result.data[1].merkleProof,
						signedData,
					]
				),
				"0x1965cd0Bf68Db7D007613E79d8386d48B9061ea6",
			]
		);
		const crossChainUserOperationResponse = await sendCrossChainUserOperation(
			crossChainUserOperation,
			signature0,
			signature1,
			_targetChainId,
			_aaWalletAddress,
			proxy
		);
		if (typeof crossChainUserOperationResponse.data.error != "undefined") {
			console.log("\x1b[31m%s\x1b[0m", `Transaction failed: `, crossChainUserOperationResponse.data.error, '\x1b[0m');
		}
		try {
			if (typeof crossChainUserOperationResponse.data.result._id === "undefined") {
				console.log("\x1b[31m%s\x1b[0m", `Check in failed\x1b[0m`);
				return null;
			}
			console.log('\x1b[32m%s\x1b[0m', new Date().toLocaleString() +
			":\t\tCheck in Success: " + crossChainUserOperationResponse.data.result._id, '\x1b[0m');
			return crossChainUserOperationResponse.data.result._id;
		}
		catch (e) {
			console.log("\x1b[31m%s\x1b[0m", 'Error: ' + JSON.stringify(crossChainUserOperationResponse.data));
		}
	}
	catch (e) {
		console.log(e);
	}
	checkedIn = true;
	return null;
}

async function checkStreak(token, macKey, deviceId) {
    try {
        let _params = buildRequestParams({
            "device_id": deviceId,
            "mac_key": macKey,
            "random_str": uuidv4() 
        });
        const response = await axios.post("https://pioneer-api.particle.network/streaks/check_streak?" + _params, {},
        {
            headers: {
                "Authorization": "Bearer " + token,
            },
            timeout: 90000
        }
        );
        return response.data;
    } catch (e) {
        console.log(e);
    }
    return null;
}

async function checkTxPoint(token, macKey, deviceId) {
	try {
		let _params = buildRequestParams({
		 "device_id": deviceId,
		 "mac_key": macKey,
		 "random_str": uuidv4() 
		});
		const checkTxPointResponse = await axios.post("https://pioneer-api.particle.network/users/check_tx_point?" + _params, {},
		  {
			headers: {
			  "Authorization": "Bearer " + token,
			},
			timeout: 90000
		  }
		);
		return checkTxPointResponse.data;
	} catch (e) {
		console.log(e);
	}
	return null;
}

async function getCrossChainUserOperation(targetChainId, operationId, proxyAgent) {
	try {
		let _cnt = 1;
		while(true) {
			if (_cnt > 60) {
				// Log with color red
				console.log("\x1b[31m%s\x1b[0m", `Transaction skipped after 60 times\x1b[0m`);
				return true;
			}
			try {
				console.log(
					new Date().toLocaleString() +
					`: Getting cross chain user operation ${_cnt}/60...` +
					operationId
				);
				const _getCrossChainUserOperation = await axios.post(
					"https://universal-api.particle.network/",
					{
						jsonrpc: "2.0",
						chainId: targetChainId,
						method: "universal_getCrossChainUserOperation",
						params: [operationId],
					},
					{httpsAgent: proxyAgent}
				);
				if (typeof _getCrossChainUserOperation.data.result.particleSendFailedReason !== "undefined") {
					console.log(
						new Date().toLocaleString() + `:\x1b[32m%s\x1b[0m\t\t Transaction failed: ${_getCrossChainUserOperation.data.result.particleSendFailedReason}\x1b[0m`
					);
					break;
				}
				if (typeof _getCrossChainUserOperation.data.result.targetUserOpEvent !== "undefined" && typeof _getCrossChainUserOperation.data.result.targetUserOpEvent.txHash != 'undefined') {
					console.log(
						`\x1b[1A\x1b[K\x1b[1A\x1b[K${new Date().toLocaleString()}: Found tx hash: ${
							_getCrossChainUserOperation.data.result.targetUserOpEvent.txHash
						}.Status: ${_getCrossChainUserOperation.data.result.status} | Confirmations ${_getCrossChainUserOperation.data.result.confirmations}\x1b[0m`
					);
				}
				if (
					(typeof _getCrossChainUserOperation.data.result.status !== "undefined" && _getCrossChainUserOperation.data.result.status > 3)/* ||
					(_getCrossChainUserOperation.data.result.status == 3 && _getCrossChainUserOperation.data.result.confirmations >=3)*/
				) {
					// console.log("\n")
					console.log('\x1b[32m%s\x1b[0m', new Date().toLocaleString() + ": Transaction success", '\x1b[0m');
					return true;
				}
			}
			catch (e) {
				console.log(e);
			}
			await sleep(5000);
			_cnt++;
		}
	}
	catch (e) {
		console.log(e);
	}
	return false;
}

async function main (){
	// Shuffle credentials
	// credentials = credentials.sort(() => Math.random() - 0.5);
	if (credentials.length == 0) {
		console.log('NO CREDENTIALS TO RUN');
		process.exit(0);
	}
	console.log('================== TOTAL CREDENTIALS TO RUN: [' + credentials.length + '] ==================');
	for (let i = 0, cl = credentials.length; i < cl; i++) {
		// Sum the total number of txSuccess
		let totalTxSuccess = 0;
		for (let key in txSuccess) {
			totalTxSuccess += txSuccess[key];
		}
		// If total success is greater than maxSuccess * credentials.length, exit
		if (totalTxSuccess >= successMaxCnt * credentials.length) {
			console.log(`Total success reached max success count [${totalTxSuccess}]`);
			process.exit(0);
		}

		console.log(`||||||||||||||||| Total success: ${totalTxSuccess}/${successMaxCnt * credentials.length}`);
		if (i % 5 == 0 && i > 0) {
			await getNewProxy();
		}
		let account = credentials[i];
		// let account = credentials[accountIdx];
		let proxy = account.proxy;
		if (!proxy) {
			proxyAgent = null;
		}
		else {
			proxyAgent = new HttpsProxyAgent("http://" + proxy);
		}
		if (proxyAgent) {
			console.log('ProxyAgent', proxyAgent.proxy.origin);
		}
		let privateKey = account.privateKey;	
		// let aaWalletAddress = account.aaWalletAddress;
		// Get wallet address from private key
		const signer = new ethers.Wallet(privateKey);
		const walletAddress = signer.address;
		if (typeof txSuccess[walletAddress] == 'undefined') {
			txSuccess[walletAddress] = 0;
		}
		if (txSuccess[walletAddress] >= successMaxCnt) {
			console.log('Max success count reached for this address');
			continue;
		}
		// Login to Particle
		const deviceId = uuidv4();
		const msgToSign = `Welcome to Particle Pioneer!\n\nWallet address:\n${walletAddress}\n\nNonce:\n${deviceId}`;
		const signedLoginData = await signer.signMessage(msgToSign);
		console.log(`\n${new Date().toLocaleString()}: [${i}/${cl}] Address: ${walletAddress}------------------`);
		const params = {
			"loginMethod": "evm_wallet",
			"loginSource": "metamask",
			"loginInfo": {
				"address": walletAddress.toLocaleLowerCase(),
				"signature": signedLoginData
			}
		};
		const loginResponse = await loginToParticle(params, deviceId);
		if (!loginResponse) {
			console.log('Login failed');
			return;
		}
		aaWalletAddress = loginResponse.aaAddress;
		try {
			let pointHistory = await getPointHistory(loginResponse.token, loginResponse.macKey, deviceId);
			getTodayData(pointHistory);
		}
		catch(e){
			console.log('getPointHistory ERROR', e);
		}
		// Show wallet address in green color
		valueToSend = parseFloat('0.000' + String(randomNumberRange(1, 20)));
		console.log("\x1b[32m%s\x1b[0m", `Owner Address: ${walletAddress}\nAA Wallet Address: ${aaWalletAddress}\nChain ID: ${targetChainId} | Value: ${valueToSend}\nTotal point: ${parseInt(loginResponse.totalPoint).toLocaleString()}\nSuccess: ${txSuccess[walletAddress]}\x1b[0m`);
		// checTxPoint
		// const checkTxPointResponse = await checkTxPoint(loginResponse.token, loginResponse.macKey, deviceId);
		// const checkStreakTxResponse = await checkStreakTx(loginResponse.token, loginResponse.macKey, deviceId);
		// if (!checkTxPointResponse) {
		// 	console.log('checkTxPoint failed', checkTxPointResponse);
		// 	return;
		// }
		// console.log('Check Tx Point:', checkTxPointResponse, checkStreakTxResponse);

		if (!checkedIn && successMaxCnt > 99) {
			try {
				// await checkInDaily(aaWalletAddress, walletAddress, signer);
				checkInTx = await checkInDaily(aaWalletAddress, walletAddress, signer, proxy);
				if (checkInTx) {
					await getCrossChainUserOperation(11155420, checkInTx, proxyAgent);
					const checkStreaks = await checkStreak(loginResponse.token, loginResponse.macKey, deviceId);
					console.log('Check streaks for checkin daily: ', checkStreaks);
				}
			}
			catch (e) {
				console.log(e);
			}
		}
		// Check Tx point
		const checkTxPointResponse = await checkTxPoint(loginResponse.token, loginResponse.macKey, deviceId);
		console.log('Check Tx Point:', checkTxPointResponse);
		// console.log(new Date().toLocaleString() + ": Creating cross chain user operation...");
		let crossChainUserOperation = null;
		try {
			crossChainUserOperation = await createCrossChainUserOperation(
				aaWalletAddress, walletAddress, "0x", 
				Math.round(valueToSend), targetChainId, "21000", 
				"5000000000", "0x0", walletAddress
			);
		}
		catch (e) {
			console.log('Creating cross chain user operation failed', e);
			if (typeof crossChainUserOperation != 'undefined') {
				console.log(crossChainUserOperation);
			}
		}
		try {
			console.log(
				new Date().toLocaleString() +
				":\t\tSuccess: " + crossChainUserOperation.data.result.userOps[0].userOpHash
			);
		}
		catch (e) {
			console.log(e);
			if (typeof crossChainUserOperation === "undefined") {
				console.log(
					new Date().toLocaleString() + ":\x1b[31m%s\x1b[0m",
					`Transaction failed`
				);
				return;
			}
			else {
				console.log(
					new Date().toLocaleString() + ":\x1b[31m%s\x1b[0m",
					`Transaction failed`, crossChainUserOperation.data
				);
				return;
			}
		}
		// createMultiChainUnsignedData
		const unixTimeNow = Math.floor(Date.now() / 1e3) - 600;
		const unixTimeUtil = Math.floor(Date.now() / 1e3) + 600;
		
		console.log(
			new Date().toLocaleString() + ": Creating multi chain unsigned data..."
		);
		const createMultiChainUnsignedDataResponse = await createMultiChainUnsignedData(
			[
				{
					chainId: targetChainId,
					userOpHash:
					crossChainUserOperation.data.result.userOps[0].userOpHash,
					validUntil: unixTimeUtil,
					validAfter: unixTimeNow,
				},
				{
					chainId: 2011,
					userOpHash:
					crossChainUserOperation.data.result.userOps[1].userOpHash,
					validUntil: unixTimeUtil,
					validAfter: unixTimeNow,
				},
			],
			walletAddress,
			targetChainId
		);
		if (!createMultiChainUnsignedDataResponse) {
			console.log('\x1b[31m%s\x1b[0m', `createMultiChainUnsignedData failed`, '\x1b[0m');
			return;
		}
		console.log(
			new Date().toLocaleString() +
			":\t\tSuccess: " +
			createMultiChainUnsignedDataResponse.data.result.merkleRoot
		);
		
		const signedData = await signer.signMessage(
			ethers.toBeArray(createMultiChainUnsignedDataResponse.data.result.merkleRoot)
		);
		const signature0 = AbiCoder.encode(
			["bytes", "address"],
			[
				AbiCoder.encode(
					["uint48", "uint48", "bytes32", "bytes32[]", "bytes"],
					[
						createMultiChainUnsignedDataResponse.data.result.data[0].validUntil,
						createMultiChainUnsignedDataResponse.data.result.data[0].validAfter,
						createMultiChainUnsignedDataResponse.data.result.merkleRoot,
						createMultiChainUnsignedDataResponse.data.result.data[0].merkleProof,
						signedData,
					]
				),
				"0x1965cd0Bf68Db7D007613E79d8386d48B9061ea6",
			]
		);
		const signature1 = AbiCoder.encode(
			["bytes", "address"],
			[
				AbiCoder.encode(
					["uint48", "uint48", "bytes32", "bytes32[]", "bytes"],
					[
						createMultiChainUnsignedDataResponse.data.result.data[1].validUntil,
						createMultiChainUnsignedDataResponse.data.result.data[1].validAfter,
						createMultiChainUnsignedDataResponse.data.result.merkleRoot,
						createMultiChainUnsignedDataResponse.data.result.data[1].merkleProof,
						signedData,
					]
				),
				"0x1965cd0Bf68Db7D007613E79d8386d48B9061ea6",
			]
		);
		const sendCrossChainUserOperationResponse = await sendCrossChainUserOperation(
			crossChainUserOperation,
			signature0,
			signature1,
			targetChainId,
			aaWalletAddress,
			proxy
		);
		
		if (typeof sendCrossChainUserOperationResponse.data.error != "undefined") {
			console.log(
				"\x1b[31m%s\x1b[0m",
				`Transaction failed: `,
				sendCrossChainUserOperationResponse.data.error, '\x1b[0m'
			);
			let errorData = JSON.stringify(sendCrossChainUserOperationResponse.data.error);
			if (
				JSON.stringify(errorData).indexOf("duplicate key error") >
				-1
				|| JSON.stringify(errorData).indexOf('You have a transaction in pending status') > -1
			) {
				console.log("\x1b[31m%s\x1b[0m", `Waiting 60s to retry...\x1b[0m`);
				await sleep(60000);
			}
			if (
				JSON.stringify(errorData).indexOf("You are sending too often") >
				-1
			) {
				console.log("\x1b[31m%s\x1b[0m", `Waiting 30s to retry...\x1b[0m`);
				await sleep(30000);
			}
			if (
				JSON.stringify(errorData).indexOf("today is full") >
				-1
			) {
				console.log("\x1b[31m%s\x1b[0m", `Limit reached, exiting...\x1b[0m`);
				// Change IP
				await getNewProxy();
				// process.exit(0);
			}
			return;
		}
		if (typeof sendCrossChainUserOperationResponse.data.result._id === "undefined") {
			console.log("\x1b[31m%s\x1b[0m", `Transaction failed\x1b[0m`);
			return;
		}
		console.log(new Date().toLocaleString() +
		":\t\tSuccess: " + sendCrossChainUserOperationResponse.data.result._id);
		// getCrossChainUserOperation

		const operationResult = await getCrossChainUserOperation(targetChainId, sendCrossChainUserOperationResponse.data.result._id, proxyAgent);
		if (operationResult) txSuccess++;
	}
}

(async () => {
	let i = 0;
	// Get credentials from startIdx to endIdx
	credentials = credentials.slice(credentialStartIdx, credentialEndIdx);
	while(true) {
		try {
			// console.log(`==================== ${txSuccess}/${i}/${successMaxCnt} ====================`);
			await main();
			// await getUserPoint();
		} catch (e) {
			console.log(e);
		}
		i++;
	}
	// console.log('txSuccess', txSuccess);
	// let pointHistory = await getPointHistory();
	// getTodayData(pointHistory.data);
})();