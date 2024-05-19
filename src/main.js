import express from 'express'
import shell from 'shelljs'
const app = express()

const availableHttpPort = ['1111', '2222', '3333', '4444', '5555', '6666']
const availableSocksPort = ['1111', '2222', '3333', '4444', '5555', '6666']
const username = 'syedharwandy'
const password = 'Asyraf1994'

app.use(express.json())

app.get('/', (req, res) => {
	res.json({ Ip: '192.168.0.1', Port: '1223', Username: 'syedafs', Password: '123213213' })
})

//Set Ipv6 Proxy
app.post('/setipv6proxy', async (req, res) => {
	const ipv6Proxy = await req.body['Ipv6 Proxy']
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
	shell
		.ShellString(`proxy -p${currentHttpPort} -a -n -6 -i0.0.0.0 -e${await ipv6Proxy}\n`)
		.toEnd('/usr/local/etc/3proxy/cfg/3proxy.cfg') //Http
	shell
		.ShellString(`socks -p${currentSockPort} -a -n -6 -i0.0.0.0 -e${await ipv6Proxy}\n`)
		.toEnd('/usr/local/etc/3proxy/cfg/3proxy.cfg') //Socks
	// shell.exec(`ip -6 addr add ${await ipv6Proxy}/64 dev enp0s3`)

	res.json({
		LocalIp: localIp,
		HttpPort: currentHttpPort,
		SocksPort: currentSockPort,
		Ipv6Address: await ipv6Proxy,
		Username: username,
		Password: password,
	})
})
//Remove Ipv6 Proxy
app.post('/removeipv6proxy', async (req, res) => {})

app.listen(4000, () => {
	console.log('Listen To 4000')
})
