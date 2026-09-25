const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const memoryUsers = [];

const MAX_ADDRESSES = 10;

const CONTACT_FIELDS = ["phone", "alternatePhone", "organization", "jobTitle", "website", "bio"];
const ADDRESS_FIELDS = [
  "label",
  "fullName",
  "line1",
  "line2",
  "city",
  "state",
  "postalCode",
  "country",
  "phone",
];

function emptyContact() {
  return Object.fromEntries(CONTACT_FIELDS.map((f) => [f, ""]));
}

/** Copy only whitelisted keys, so request bodies can't smuggle in other fields. */
function pick(source, fields) {
  const out = {};
  for (const f of fields) {
    if (source[f] !== undefined) out[f] = source[f];
  }
  return out;
}

class StoreError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    contact: { ...emptyContact(), ...(user.contact || {}) },
    addresses: (user.addresses || []).map((a) => ({ ...a })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** Exactly one default whenever any address exists. */
function normalizeDefault(addresses, preferredId) {
  if (addresses.length === 0) return;
  const target =
    (preferredId && addresses.find((a) => a.id === preferredId)) ||
    addresses.find((a) => a.isDefault) ||
    addresses[0];
  for (const a of addresses) a.isDefault = a === target;
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
        contact: emptyContact(),
        addresses: [],
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
    async updateProfile(id, { name, contact }) {
      const user = memoryUsers.find((u) => u.id === id);
      if (!user) return null;
      if (name !== undefined) user.name = name;
      if (contact) user.contact = { ...user.contact, ...pick(contact, CONTACT_FIELDS) };
      user.updatedAt = new Date();
      return publicUser(user);
    },
    async addAddress(id, input) {
      const user = memoryUsers.find((u) => u.id === id);
      if (!user) return null;
      if (user.addresses.length >= MAX_ADDRESSES) {
        throw new StoreError(400, `You can save up to ${MAX_ADDRESSES} addresses`);
      }
      const now = new Date();
      const address = {
        id: crypto.randomUUID(),
        label: "Home",
        fullName: "",
        line2: "",
        state: "",
        postalCode: "",
        phone: "",
        ...pick(input, ADDRESS_FIELDS),
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };
      user.addresses.push(address);
      normalizeDefault(user.addresses, input.isDefault ? address.id : undefined);
      user.updatedAt = now;
      return publicUser(user);
    },
    async updateAddress(id, addressId, input) {
      const user = memoryUsers.find((u) => u.id === id);
      if (!user) return null;
      const address = user.addresses.find((a) => a.id === addressId);
      if (!address) throw new StoreError(404, "Address not found");
      Object.assign(address, pick(input, ADDRESS_FIELDS), { updatedAt: new Date() });
      if (input.isDefault) normalizeDefault(user.addresses, addressId);
      user.updatedAt = new Date();
      return publicUser(user);
    },
    async removeAddress(id, addressId) {
      const user = memoryUsers.find((u) => u.id === id);
      if (!user) return null;
      const index = user.addresses.findIndex((a) => a.id === addressId);
      if (index === -1) throw new StoreError(404, "Address not found");
      user.addresses.splice(index, 1);
      normalizeDefault(user.addresses);
      user.updatedAt = new Date();
      return publicUser(user);
    },
    async setDefaultAddress(id, addressId) {
      const user = memoryUsers.find((u) => u.id === id);
      if (!user) return null;
      if (!user.addresses.some((a) => a.id === addressId)) {
        throw new StoreError(404, "Address not found");
      }
      normalizeDefault(user.addresses, addressId);
      user.updatedAt = new Date();
      return publicUser(user);
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
    async updateProfile(id, { name, contact }) {
      const user = await User.findById(id);
      if (!user) return null;
      if (name !== undefined) user.name = name;
      if (contact) {
        const current = user.contact ? user.contact.toObject() : {};
        user.contact = { ...current, ...pick(contact, CONTACT_FIELDS) };
      }
      await user.save();
      return user.toPublic();
    },
    async addAddress(id, input) {
      const user = await User.findById(id);
      if (!user) return null;
      if (user.addresses.length >= MAX_ADDRESSES) {
        throw new StoreError(400, `You can save up to ${MAX_ADDRESSES} addresses`);
      }
      user.addresses.push({ ...pick(input, ADDRESS_FIELDS), isDefault: false });
      const added = user.addresses[user.addresses.length - 1];
      setMongoDefault(user.addresses, input.isDefault ? added._id.toString() : undefined);
      await user.save();
      return user.toPublic();
    },
    async updateAddress(id, addressId, input) {
      const user = await User.findById(id);
      if (!user) return null;
      const address = findSubdoc(user.addresses, addressId);
      if (!address) throw new StoreError(404, "Address not found");
      address.set(pick(input, ADDRESS_FIELDS));
      if (input.isDefault) setMongoDefault(user.addresses, addressId);
      await user.save();
      return user.toPublic();
    },
    async removeAddress(id, addressId) {
      const user = await User.findById(id);
      if (!user) return null;
      const address = findSubdoc(user.addresses, addressId);
      if (!address) throw new StoreError(404, "Address not found");
      address.deleteOne();
      setMongoDefault(user.addresses);
      await user.save();
      return user.toPublic();
    },
    async setDefaultAddress(id, addressId) {
      const user = await User.findById(id);
      if (!user) return null;
      if (!findSubdoc(user.addresses, addressId)) {
        throw new StoreError(404, "Address not found");
      }
      setMongoDefault(user.addresses, addressId);
      await user.save();
      return user.toPublic();
    },
  };
}

/** DocumentArray#id() throws a CastError on malformed ids; treat those as not found. */
function findSubdoc(list, subId) {
  try {
    return list.id(subId);
  } catch {
    return null;
  }
}

function setMongoDefault(addresses, preferredId) {
  if (addresses.length === 0) return;
  const target =
    (preferredId && addresses.find((a) => a._id.toString() === preferredId)) ||
    addresses.find((a) => a.isDefault) ||
    addresses[0];
  for (const a of addresses) a.isDefault = a === target;
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
  StoreError,
};
