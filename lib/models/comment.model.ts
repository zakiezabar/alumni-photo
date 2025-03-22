import {Schema, model, models} from 'mongoose';

const CommentSchema = new Schema({
    content: {
        type: String,
        required: true,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
    },
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
    },
    isEdited: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Comment = models?.Comment || model('Comment', CommentSchema);

export default Comment;