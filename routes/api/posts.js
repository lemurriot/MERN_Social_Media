const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

// Post model
const Post = require('./../models/Post');
// Profile model
const Profile = require('./../models/Profile');

// Validation
const validatePostInput = require('../../validation/post');

// @route    GET api/posts/test
// @desc     Tests post route
// @access   Public
router.get('/test', (req, res) => res.json({msg: "Posts Works"}));

// @route    GET api/posts
// @desc     Get posts
// @access   Public
router.get('/', (req, res) => {
    Post.find()
        .sort({ date: -1 })
        .then(posts => res.json(posts))
        .catch(err => res.status(404).json({ nopostsfound: 'No posts found' }));
});

// @route    GET api/posts/:id
// @desc     Get posts by id
// @access   Public
router.get('/:id', (req, res) => {
    Post.findById(req.params.id)
        .then(post => res.json(post))
        .catch(err => res.status(404).json({ nopostfound: 'No post found with that ID' }));
});

// @route    POST api/posts
// @desc     Create posts
// @access   Private
router.post('/', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    //Check Validation
    if (!isValid){
        // If any errors, send 400 w/ errors object
        return res.status(400).json(errors)
    }

    const newPost = new Post({
        text: req.body.text,
        name: req.body.name,
        avatar: req.body.avatar,
        user: req.user.id
    });

    newPost.save().then(post => res.json(post));
});

// @route    DELETE api/posts/:id
// @desc     create post
// @access   PRIVATE
router.delete('/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Profile.findOne({ user: req.user.id })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // Check for post owner -- only post owner can delete their own post
                    if (post.user.toString() !== req.user.id) {
                        return res.status(401).json({ notauthorized: 'User not authorized '});
                    }

                    // Delete
                    post.remove().then(() => res.json({ success: true }));
                })
                .catch(err => res.status(404).json({ postnotfound: 'No post found'}));
        })
});

// @route    POST api/posts/like/:id
// @desc     like post
// @access   PRIVATE
router.post('/like/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Profile.findOne({ user: req.user.id })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // Check if user has already 'liked' this comment
                  if (post.likes.filter(like => like.user.toString() === req.user.id).length > 0){
                    return res.status(400).json({ alreadyliked: 'User already like this post' });
                  }  
                    // Add user id to likes array
                    post.likes.unshift({ user: req.user.id });

                    post.save().then(post => res.json(post));
                })
                .catch(err => res.status(404).json({ postnotfound: 'No post found'}));
        })
})

// @route    POST api/posts/unlike/:id
// @desc     like post
// @access   PRIVATE
router.post('/unlike/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Profile.findOne({ user: req.user.id })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // Check if user has already 'liked' this comment
                  if (post.likes.filter(like => like.user.toString() === req.user.id).length === 0){
                    return res.status(400).json({ notliked: 'You have not yet liked this post' });
                  }  
                    // Get remove index
                    const removeIndex = post.likes
                        .map(item => item.user.toString())
                        .indexOf(req.user.id);

                    // Splice out of array
                    post.likes.splice(removeIndex, 1);

                    // Save
                    post.save().then((post => res.json(post)));
                })
                .catch(err => res.status(404).json({ postnotfound: 'No post found'}));
        })
})

// @route    POST api/posts/comment/:id
// @desc     add comment to post
// @access   PRIVATE
router.post('/comment/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    //Check Validation
    if (!isValid){
        // If any errors, send 400 w/ errors object
        return res.status(400).json(errors)
    }
    
    Post.findById(req.params.id)
        .then(post => {
            const newComment = {
                text: req.body.text,
                name: req.body.name,
                avatar: req.body.avatar,
                user: req.user.id
            }

            // Add to comments array
            post.comments.unshift(newComment);

            //Save
            post.save().then(post => res.json(post))
        })
        .catch(err => res.status(404).json({ postnowfound: 'No post found'}));
});

// @route    DELETE api/posts/comment/:id/:comment_id
// @desc     delete comment to post
// @access   PRIVATE
router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', { session: false }), (req, res) => {

    Post.findById(req.params.id)
        .then(post => {
            // Check to see if comment exists
            if (post.comments.filter(comment => comment._id.toString() === req.params.comment_id).length === 0){
                return res.status(404).json({ commentnotexists: 'Comment does not exist' });
            }

            // Get remove index
            const removeIndex = post.comments
                .map(item => item._id.toString())
                .indexOf(req.params.comment_id);

            // splice comment out of array
            post.comments.splice(removeIndex, 1);

            post.save().then(post => res.json(post));
        })
        .catch(err => res.status(404).json({ postnowfound: 'No post found'}));
});

module.exports = router;