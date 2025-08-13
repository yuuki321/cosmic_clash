const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { AUTH } = require('../config/constants');

class AuthService {
    constructor() {
        this.dbPath = path.join(__dirname, '../../database.json');
    }

    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    generateSessionToken() {
        return crypto.randomBytes(AUTH.SESSION_TOKEN_LENGTH).toString('hex');
    }

    async readDatabase() {
        try {
            const data = await fs.readFile(this.dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    async writeDatabase(data) {
        await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2));
    }

    async signup(username, password) {
        const database = await this.readDatabase();
        
        if (database[username]) {
            throw new Error('Username already exists');
        }

        database[username] = { 
            password: this.hashPassword(password) 
        };
        
        await this.writeDatabase(database);
        return true;
    }

    async login(username, password) {
        const database = await this.readDatabase();
        const hashedPassword = this.hashPassword(password);

        if (!database[username] || database[username].password !== hashedPassword) {
            throw new Error('Invalid credentials');
        }

        const sessionToken = this.generateSessionToken();
        database[username].sessionToken = sessionToken;
        await this.writeDatabase(database);

        return { sessionToken, username };
    }

    async validateSession(sessionToken, username) {
        const database = await this.readDatabase();
        return database[username]?.sessionToken === sessionToken;
    }
}

module.exports = new AuthService(); 