# JsSIP New Design

JsSIP is taking another approach for the new version 0.4. It will not include WebRTC capabilities at all, but instead it will integrate a separate WebRTC library (already being developed). All the WebRTC related stuff will be handle by the separate library.

This is a MUST given that most of the issues and feature requests in JsSIP are related to WebRTC and it is hard to handle them within JsSIP itself. JsSIP will provide an API for the external application to set and get SDP bodies, and will also implement Trickle-ICE as [SIP usage for Trickle ICE draft](http://tools.ietf.org/html/draft-ivov-mmusic-trickle-ice-sip) defines.

WebRTC related issues will then be closed in the JsSIP tracker. The new WebRTC "just media" library will be much more powerful and reliable than the current WebRTC code within JsSIP.
