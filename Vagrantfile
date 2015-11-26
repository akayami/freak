# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.require_version ">= 1.7.4"

Vagrant.configure(2) do |config|

  # Official Ubuntu 14.04
  config.vm.box = "ubuntu/trusty64"

  # Faster to share files between Host and Guest
  if Vagrant::Util::Platform.windows?
    config.vm.synced_folder ".", "/vagrant", type: "smb"
  else
    config.vm.synced_folder ".", "/vagrant", :nfs => true
  end

  # VM Config
  config.vm.provider "virtualbox" do |v|
    v.memory = 2048
    v.cpus = 2
  end

  # Network
  config.vm.network "private_network", ip: "192.168.99.99"
  config.vm.network :forwarded_port, host: 3000, guest: 3000, auto_correct: true
  config.vm.usable_port_range = 8080..8999

  # Provisioning
  config.vm.provision :shell, :path => './vagrant/provision_once.sh'
  config.vm.provision :shell, :path => './vagrant/provision_always.sh', run: "always"

end
