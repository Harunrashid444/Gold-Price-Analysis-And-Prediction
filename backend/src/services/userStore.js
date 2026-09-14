const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const memoryUsers = [];

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createMemoryStore() {
  return {
    async findByEmail(email, withSecrets = false) {
      const user = memoryUsers.find((u) => u.email === email.toLowerCase());
      if (!user) return null;
      return withSecrets ? user : publicUser(user);
    },
    async findById(id, withSecrets = false) {
      const user = memoryUsers.find((u) => u.id === id);
      if (!user) return null;
      return withSecrets ? user : publicUser(user);
    },
    async create({ name, email, passwordHash }) {
      const now = new Date();
      const user = {
        id: crypto.randomUUID(),
        name,
        email: email.toLowerCase(),
        passwordHash,
        createdAt: now,
        updatedAt: now,
        resetTokenHash: null,
        resetTokenExpires: null,
      };
      memoryUsers.push(user);
      return publicUser(user);
    },
    async updatePassword(id, passwordHash) {
      const user = memoryUsers.find((u) => u.id === id);
      if (!user) return null;
      user.passwordHash = passwordHash;
      user.updatedAt = new Date();
      user.resetTokenHash = null;
      user.resetTokenExpires = null;
      return publicUser(user);
    },
    async setResetToken(email, tokenHash, expires) {
      const user = memoryUsers.find((u) => u.email === email.toLowerCase());
      if (!user) return null;
      user.resetTokenHash = tokenHash;
      user.resetTokenExpires = expires;
      return publicUser(user);
    },
    async findByResetToken(tokenHash) {
      const now = new Date();
      return (
        memoryUsers.find(
          (u) => u.resetTokenHash === tokenHash && u.resetTokenExpires && u.resetTokenExpires > now
        ) || null
      );
    },
  };
}

function createMongoStore(User) {
  function toSecure(user) {
    return {
      ...user.toPublic(),
      passwordHash: user.passwordHash,
      resetTokenHash: user.resetTokenHash,
      resetTokenExpires: user.resetTokenExpires,
    };
  }

  return {
    async findByEmail(email, withSecrets = false) {
      const query = User.findOne({ email: email.toLowerCase() });
      if (withSecrets) query.select("+passwordHash +resetTokenHash +resetTokenExpires");
      const user = await query;
      if (!user) return null;
      return withSecrets ? toSecure(user) : user.toPublic();
    },
    async findById(id, withSecrets = false) {
      const query = User.findById(id);
      if (withSecrets) query.select("+passwordHash");
      const user = await query;
      if (!user) return null;
      return withSecrets ? toSecure(user) : user.toPublic();
    },
    async create({ name, email, passwordHash }) {
      const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
      return user.toPublic();
    },
    async updatePassword(id, passwordHash) {
      const user = await User.findById(id).select("+passwordHash +resetTokenHash +resetTokenExpires");
      if (!user) return null;
      user.passwordHash = passwordHash;
      user.resetTokenHash = undefined;
      user.resetTokenExpires = undefined;
      await user.save();
      return user.toPublic();
    },
    async setResetToken(email, tokenHash, expires) {
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "+resetTokenHash +resetTokenExpires"
      );
      if (!user) return null;
      user.resetTokenHash = tokenHash;
      user.resetTokenExpires = expires;
      await user.save();
      return user.toPublic();
    },
    async findByResetToken(tokenHash) {
      const user = await User.findOne({
        resetTokenHash: tokenHash,
        resetTokenExpires: { $gt: new Date() },
      }).select("+passwordHash +resetTokenHash +resetTokenExpires");
      return user ? toSecure(user) : null;
    },
  };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  createMemoryStore,
  createMongoStore,
  hashPassword,
  verifyPassword,
  publicUser,
};
