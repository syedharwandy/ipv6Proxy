import express from 'express'
import shell from 'shelljs'
import Queue from './dataQueue.js'

const httpQue = new Queue()
const app = express()
const serverPort = 4000

const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 60000)

const mainIpv6 = await fetch('https://v6.ipv6-test.com/api/myip.php', { signal: controller.signal }).then(async (getIpv6) => {
	clearTimeout(timeoutId)
	const currentNewIP = (await getIpv6.text()).split(':')
	const mainIpv6 = `${await currentNewIP[0]}:${await currentNewIP[1]}:${await currentNewIP[2]}:${await currentNewIP[3]}`
	if ((await mainIpv6.includes(':')) !== true) {
		shell.echo(`Unable Get Ipv6 Current IP Get : ${await getIpv6.text()}`)
		process.exit(1)
	}
	return await mainIpv6
})

console.log(mainIpv6)

let availableHttpPort = [
	10000, 10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010, 10011, 10012, 10013, 10014, 10015, 10016, 10017,
	10018, 10019, 10020, 10021, 10022, 10023, 10024, 10025, 10026, 10027, 10028, 10029, 10030, 10031, 10032, 10033, 10034, 10035,
	10036, 10037, 10038, 10039, 10040, 10041, 10042, 10043, 10044, 10045, 10046, 10047, 10048, 10049, 10050,
]

for (let x = 0; x < availableHttpPort.length; x++) {
	httpQue.enqueue(availableHttpPort[x])
}

function autoRemoveConnection(httpPort, socksPort, ipv6Address) {
	setTimeout(() => {
		shell.echo(`Remove Unused Port [H:${httpPort}|S:${socksPort}] For [${ipv6Address}]`)
		//Remove Port From File
		const newRegexHttp = new RegExp(`.*-p${httpPort}.*`, 'd') //Working
		const newRegexSocks = new RegExp(`.*-p${socksPort}.*`, 'd') //Working
		shell.sed('-i', newRegexHttp, '', '/usr/local/3proxy/conf/3proxy.cfg')
		shell.sed('-i', newRegexSocks, '', '/usr/local/3proxy/conf/3proxy.cfg')

		shell.exec(`ip -6 addr del ${ipv6Address}/64 dev enp0s3`)
	}, 10 * 60000)
}

const username = 'syedharwandy'
const password = 'Asyraf1994'

app.use(express.json())

app.get('/startProxy', (req, res) => {
	shell.echo(`Start IPV6 PROXY Using Port ${serverPort}`)
	shell
		.ShellString(
			'nscache 65536\nnserver 8.8.8.8\nnserver 8.8.4.4\n\nconfig /conf/3proxy.cfg\nmonitor /conf/3proxy.cfg\n\ncounter /count/3proxy.3cf\nusers $/conf/passwd\n\ninclude /conf/counters\ninclude /conf/bandlimiters\n\nauth strong\nallow *\n'
		)
		.to('/usr/local/3proxy/conf/3proxy.cfg') //New Cfg File

	setTimeout((r) => r, 20000)
	shell.chmod(700, '/usr/local/3proxy/conf/3proxy.cfg')
	shell.exec(`systemctl stop 3proxy.service`)
	setTimeout((r) => r, 20000)
	shell.exec(`systemctl start 3proxy.service`)

	res.send('Proxy Restart')
})
//Set Ipv6 Proxy
app.post('/setipv6proxy', (req, res) => {
	let ipv6Address = req.body['Ipv6 Address']
	ipv6Address = ipv6Address.replace('[MainIpv6]', mainIpv6)
	const localIp = req.body['Local IP']

	//Get Random Available Http Port
	const httpPort = httpQue.dequeue()
	const socksPort = httpPort + 10000
	httpQue.enqueue(httpPort)
	shell.echo(`Setup New Ipv6 Using Port [H:${httpPort}|S:${socksPort}] For [${ipv6Address}]`)

	//Remove Used Port
	const newRegexHttp = new RegExp(`.*-p${httpPort}.*`, 'd') //Working
	const newRegexSocks = new RegExp(`.*-p${socksPort}.*`, 'd') //Working
	shell.sed('-i', newRegexHttp, '', '/usr/local/3proxy/conf/3proxy.cfg')
	shell.sed('-i', newRegexSocks, '', '/usr/local/3proxy/conf/3proxy.cfg')

	// console.log(currentPort)
	shell.exec(`ip -6 addr add ${ipv6Address}/64 dev enp0s3`)
	shell.ShellString(`proxy -p${httpPort} -a -n -6 -i0.0.0.0 -e${ipv6Address}\n`).toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Http
	shell.ShellString(`socks -p${socksPort} -a -n -6 -i0.0.0.0 -e${ipv6Address}\n`).toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Socks

	shell.exec(`ufw allow ${httpPort}`)
	shell.exec(`ufw allow ${socksPort}`)

	autoRemoveConnection(httpPort, socksPort, ipv6Address)

	res.json({
		LocalIp: localIp,
		HttpPort: httpPort,
		SocksPort: socksPort,
		Ipv6Address: ipv6Address,
		Username: username,
		Password: password,
	})
})
app.listen(serverPort)
