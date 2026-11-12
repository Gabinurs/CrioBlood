const bcrypt = require('bcrypt');

// Gera a criptografia para a senha "123456"
bcrypt.hash('123456', 10).then(hash => {
    console.log('\n=== SUA SENHA CRIPTOGRAFADA ===');
    console.log(hash);
    console.log('===============================\n');
});
