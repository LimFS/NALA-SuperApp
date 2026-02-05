const SecretManager = {
    async getSecret(key) {
        return localStorage.getItem(key);
    },
    async storeSecret(key, value) {
        localStorage.setItem(key, value);
    }
};
export default SecretManager;
