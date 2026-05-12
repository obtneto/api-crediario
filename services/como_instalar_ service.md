##1. Criar atalhos
sudo ln -sf /home/ovidio-neto/Crediario/backend/services/crediario.timer /etc/systemd/system/crediario.timer
sudo ln -sf /home/ovidio-neto/Crediario/backend/services/crediario.service /etc/systemd/system/crediario.service

##2. Recarregar os serviços do systemd
sudo systemctl daemon-reload

##3. Habilitar o timer
sudo systemctl enable crediario.timer

##4. Iniciar o timer
sudo systemctl start crediario.timer

##5. Verificar o status do timer
sudo systemctl status crediario.timer

##6. Verificar o log do serviço
sudo journalctl -u crediario.service -f

##7. Verificar o log do timer
sudo journalctl -u crediario.timer -f

##8. Parar o timer
sudo systemctl stop crediario.timer

##9. Desabilitar o timer
sudo systemctl disable crediario.timer

##10. Remover o timer
sudo systemctl disable crediario.timer
sudo rm /etc/systemd/system/crediario.timer
sudo rm /etc/systemd/system/crediario.service
sudo systemctl daemon-reload

