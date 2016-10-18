# sails-hook-confirmations

Managing actions to be confirmed asynchronously

## Purpose

This hook was developed to simplify support for actions requiring confirmation, 
e.g. by clicking link in a mail sent to user's mail address. This plugin does
not provide any actual support for sending mails, but adds model and controller
for creating confirmations required to invoke some selected custom method. This
confirmation is triggered by requesting some URL provided by confirmation model
on creating new instance using `Confirmation.createProcessOnModel()` or
`Confirmation.createProcess()`. It is up to your code to send this URL to some
endpoint for requesting it to confirm selected process.

Confirmations support optional expiration.
