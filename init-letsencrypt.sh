#!/bin/bash

# Initialize Let's Encrypt certificates for quiz.pokhrelmilan.com.np and socket.pokhrelmilan.com.np
# Run this once on the server before starting docker-compose.prod.yml

set -e

domains=(quiz.pokhrelmilan.com.np socket.pokhrelmilan.com.np)
rsa_key_size=4096
data_path="./certbot"
email="" # Add your email here (optional, for renewal notifications)
staging=0 # Set to 1 for testing

if [ -d "$data_path/conf/live/${domains[0]}" ]; then
  read -p "Existing certificate found for ${domains[0]}. Delete and recreate? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
  echo
fi

echo "### Creating dummy certificate for ${domains[0]}..."
mkdir -p "$data_path/conf/live/${domains[0]}"
docker compose -f docker-compose.prod.yml run --rm --entrypoint " \
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1 \
    -keyout '$data_path/conf/live/${domains[0]}/privkey.pem' \
    -out '$data_path/conf/live/${domains[0]}/fullchain.pem' \
    -subj '/CN=localhost' \
" certbot

echo "### Starting nginx..."
docker compose -f docker-compose.prod.yml up --force-recreate -d nginx

echo "### Deleting dummy certificate for ${domains[0]}..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint " \
  rm -rf /etc/letsencrypt/live/${domains[0]} && \
  rm -rf /etc/letsencrypt/archive/${domains[0]} && \
  rm -rf /etc/letsencrypt/renewal/${domains[0]}.conf \
" certbot

echo "### Requesting Let's Encrypt certificate for ${domains[*]}..."
# Join domains to -d args
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Select appropriate email arg
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

# Enable staging mode if requested
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker compose -f docker-compose.prod.yml run --rm --entrypoint " \
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal \
" certbot

echo "### Reloading nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "### Done! Certificates are ready."
