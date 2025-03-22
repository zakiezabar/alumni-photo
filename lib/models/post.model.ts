import {Schema, model, models} from 'mongoose';

const PostSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    content: {
        type: String,
        required: true,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    tags: [{
        type: String,
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    featuredImage: String,
    viewCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Create text indexes for search functionality
PostSchema.index({ title: 'text', content: 'text' });

const Post = models?.Post || model('Post', PostSchema);

export default Post;