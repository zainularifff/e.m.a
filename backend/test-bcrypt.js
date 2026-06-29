const bcrypt = require("bcryptjs");

const hash = "$2a$10$XFtJWyxGqS1.K3qfU3Rkz.YBnqUqVVLF3K.A8H.Nk1BqeqzGmWbKe";

bcrypt.compare("Admin@123", hash).then(console.log);