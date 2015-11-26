
echo "============================== Do we need a local config file ---"
if [  ! -f "/vagrant/conf/config-local.js" ]
then
	cp /vagrant/conf/config-local-sample.js /vagrant/conf/config-local.js
  echo "********** Local config file created **********"
else
  echo "********** Nop, there is one **********"
fi

echo "--- Install NPM Modules ---"
cd /vagrant/
sudo -H -u vagrant bash -c 'cd /vagrant/ ; npm install'

echo "nodejs -v"
node -v

echo "npm -v"
npm -v
