
echo "============================== Update OS package list"
sudo apt-get update

echo "============================== Update Timezone"
sudo cp /usr/share/zoneinfo/America/Montreal /etc/localtime

echo "============================== Installing Git-core"
sudo apt-get install -y git-core

echo "============================== Installing Curl"
sudo apt-get install -y curl

echo "============================== Installing Build-essential"
sudo apt-get install -y build-essential

echo "============================== Installing OpenSsl"
sudo apt-get install -y openssl

echo "============================== Installing NodeJs"
cd /tmp
sudo curl -sS https://nodejs.org/dist/v5.0.0/node-v5.0.0-linux-x64.tar.gz | tar -xvz
sudo mv node-v5.0.0-linux-x64 /usr/local/
sudo ln -s /usr/local/node-v5.0.0-linux-x64/bin/node /usr/local/sbin/node
sudo ln -s /usr/local/node-v5.0.0-linux-x64/bin/npm /usr/local/sbin/npm

echo "============================== Removing unused packaged"
sudo apt-get -y autoremove
