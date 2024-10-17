import { promises as fsPromises } from 'fs';
import { v4 as uuid4} from 'uuid';
import { ObjectID } from 'mongodb';
import path from path
import mime from 'mime-types';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';


const fileQueue = new Queue('fileQueue');

class FilesController {
  // HANDLE FILE UPLOAD
  static async postUpload(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }

    const { name, type, parentId = 0, isPublic = false, data,} = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' }); 
    }
    
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' }); 
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' }); 
    }
  
    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files')
                            .findOne({ _id: ObjectId(parentId) });
  
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    
    const fileDocument = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId !== 0 ? ObjectId(parentId) : 0,
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDocument);
      return res.status(201).json({ id: result.insertedId, ...fileDocument });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager'; 
    const localPath = path.join(folderPath, uuidv4());

    await fsPromises.mkdir(folderPath, { recursive: true });
    
    const fileData = Buffer.from(data, 'base64');
  
    await fsPromises.writeFile(localPath, fileData);

    fileDocument.localPath = localPath;
   
    const result = await dbClient.db
      .collection('files')
      .insertOne(fileDocument);

    if (type === 'image') {
      fileQueue.add({ userId, fileId: result.insertedId.toString() });
    }

    return res.status(201).json({ id: result.insertedId, ...fileDocument });
  }


  //FETCHINCH SPECIFIC FILE AND ITS DETAILS
  static async getShow(req, res) {
    const token = req.headers['x-token'];
 
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }

    const fileId = req.params.id;
   
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' }); 
    }
   
    return res.status(200).json(file);
  }

  // LISTING FILES
  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20; 

    const files = await dbClient.db
      .collection('files')
      .aggregate([
        {
          $match: {
            parentId: parentId === '0' ? 0 : ObjectId(parentId),
            userId: ObjectId(userId),
          },
        },
        { $skip: page * pageSize },    
        { $limit: pageSize },   
      ])
      .toArray();
    return res.status(200).json(files);
  }

  // PUBLISH
  static async putPublish(req, res) {
    const token = req.headers['x-token'];
  
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }
 
    const userId = await redisClient.get(`auth_${token}`);
   
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }

    const fileId = req.params.id;

    const file = await dbClient.db.collection('files')
          .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' }); 
    }

    await dbClient.db.collection('files').updateOne(
        { _id: ObjectId(fileId), userId: ObjectId(userId) },
        { $set: { isPublic: true } },
      );

    const updatedFile = await dbClient.db.collection('files')
            .findOne({ _id: ObjectId(fileId) });
  
    return res.status(200).json(updatedFile);
  }
   
  // UUPUBLISH
  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' }); 
    }

    const fileId = req.params.id;
  
    const file = await dbClient.db.collection('files')
            .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
 
    if (!file) {
      return res.status(404).json({ error: 'Not found' }); 
    }

    await dbClient.db.collection('files').updateOne(
        { _id: ObjectId(fileId), userId: ObjectId(userId) },
        { $set: { isPublic: false } },
      );

    const updatedFile = await dbClient.db.collection('files')
            .findOne({ _id: ObjectId(fileId) });
  
    return res.status(200).json(updatedFile);
  }


  // GET FILE
  static async getFile(req, res) {
    const fileId = req.params.id; 
    const token = req.headers['x-token']; 
    
    const file = await dbClient.db.collection('files')
            .findOne({ _id: ObjectId(fileId) });
  
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { isPublic } = file;  
    const userId = token ? await redisClient.get(`auth_${token}`) : null;

    if (!isPublic && (!userId || userId !== file.userId.toString())) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let filePath = file.localPath;

    // const { size } = req.query;
    // if (size && ['100', '250', '500'].includes(size)) {
    //   filePath = `${file.localPath}_${size}`;
    // }

    try {
      const fileData = await fsPromises.readFile(filePath);  
      const mimeType = mime.lookup(file.name) || 'application/octet-stream';   
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileData);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}


export default FilesController;

