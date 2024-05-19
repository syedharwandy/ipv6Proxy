import express from 'express'
import shell from 'shelljs'
const app = express()

const availableHttpPort = ['10000', '10001', '10002', '10003', '10004', '10005', '10006', '10007', '10008', '10009', '10010']
const availableSocksPort = ['20000', '20001', '20002', '20003', '20004', '20005', '20006', '20007', '20008', '20009', '20010']
const username = 'syedharwandy'
const password = 'Asyraf1994'

app.use(express.json())

app.get('/', (req, res) => {
	res.json({ Ip: '192.168.0.1', Port: '1223', Username: 'syedafs', Password: '123213213' })
})

app.get('/startProxy', (req, res) => {
	shell
		.ShellString(
			'nscache 65536\nnserver 8.8.8.8\nnserver 8.8.4.4\n\nconfig /conf/3proxy.cfg\nmonitor /conf/3proxy.cfg\n\ncounter /count/3proxy.3cf\nusers $/conf/passwd\n\ninclude /conf/counters\ninclude /conf/bandlimiters\n\n'
		)
		.to('/usr/local/3proxy/conf/3proxy.cfg') //New Cfg File

	shell.chmod(700, '/usr/local/3proxy/conf/3proxy.cfg')
	shell.exec(`systemctl stop 3proxy.service`)
	shell.exec(`systemctl start 3proxy.service`)
	res.send('Proxy Restart')
})
//Set Ipv6 Proxy
app.post('/setipv6proxy', async (req, res) => {
	const ipv6Address = await req.body['Ipv6 Address']
	const localIp = await req.body['Local IP']

	//Get Random Available Http Port
	const arrayHttpPortIndex = Math.floor(Math.random() * (availableHttpPort.length - 1))
	const currentHttpPort = availableHttpPort[arrayHttpPortIndex]
	availableHttpPort.splice(arrayHttpPortIndex, 1)

	//Get Random Available Socks Port
	const arraySockPortIndex = Math.floor(Math.random() * (availableSocksPort.length - 1))
	const currentSockPort = availableSocksPort[arraySockPortIndex]
	availableSocksPort.splice(arraySockPortIndex, 1)

	// console.log(currentPort)
	shell.exec(`ip -6 addr add ${await ipv6Address}/64 dev enp0s3`)

	shell.ShellString(`auth strong#p${currentHttpPort}${currentSockPort}\n`).toEnd('/usr/local/3proxy/conf/3proxy.cfg') //auth strong
	shell
		.ShellString(`proxy -p${currentHttpPort} -a -n -6 -i0.0.0.0 -e${await ipv6Address}\n`)
		.toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Http
	shell
		.ShellString(`socks -p${currentSockPort} -a -n -6 -i0.0.0.0 -e${await ipv6Address}\n`)
		.toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Socks
	shell.ShellString(`allow users#p${currentHttpPort}${currentSockPort}\n`).toEnd('/usr/local/3proxy/conf/3proxy.cfg') //allow users
	shell.ShellString(`auth strong #p${currentHttpPort}${currentSockPort}\n`).toEnd('/usr/local/3proxy/conf/3proxy.cfg') //flush

	shell.exec(`ufw allow ${currentHttpPort}`)
	shell.exec(`ufw allow ${currentSockPort}`)

	res.json({
		LocalIp: localIp,
		HttpPort: currentHttpPort,
		SocksPort: currentSockPort,
		Ipv6Address: await ipv6Address,
		Username: username,
		Password: password,
	})
})
//Remove Ipv6 Proxy
app.post('/removeipv6proxy', async (req, res) => {
	const httpPort = req.body['HttpPort']
	const socksPort = req.body['SocksPort']
	const ipv6Address = req.body['Ipv6Address']

	shell.exec(`ip -6 addr del ${await ipv6Address}/64 dev enp0s3`)

	shell.sed('-i', `auth strong#p${httpPort}${socksPort}`, '', '/usr/local/3proxy/conf/3proxy.cfg')
	shell.sed('-i', `proxy -p${httpPort} -a -n -6 -i0.0.0.0 -e${await ipv6Address}`, '', '/usr/local/3proxy/conf/3proxy.cfg')
	shell.sed('-i', `socks -p${socksPort} -a -n -6 -i0.0.0.0 -e${await ipv6Address}`, '', '/usr/local/3proxy/conf/3proxy.cfg')
	shell.sed('-i', `allow users#p${httpPort}${socksPort}`, '', '/usr/local/3proxy/conf/3proxy.cfg')
	shell.sed('-i', `auth strong #p${httpPort}${socksPort}`, '', '/usr/local/3proxy/conf/3proxy.cfg')

	availableHttpPort.push(httpPort)
	availableSocksPort.push(socksPort)

	res.send('Ipv6 Address Remove')
})

app.listen(4000, () => {
	console.log('Listen To 4000')
})
