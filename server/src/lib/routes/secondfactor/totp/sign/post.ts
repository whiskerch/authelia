import Bluebird = require("bluebird");
import Express = require("express");

import { TOTPSecretDocument } from "../../../../storage/TOTPSecretDocument";
import Endpoints = require("../../../../../../../shared/api");
import Redirect from "../../redirect";
import ErrorReplies = require("../../../../ErrorReplies");
import { AuthenticationSessionHandler } from "../../../../AuthenticationSessionHandler";
import { AuthenticationSession } from "../../../../../../types/AuthenticationSession";
import UserMessages = require("../../../../../../../shared/UserMessages");
import { ServerVariables } from "../../../../ServerVariables";

const UNAUTHORIZED_MESSAGE = "Unauthorized access";

export default function (vars: ServerVariables) {
  function handler(req: Express.Request, res: Express.Response): Bluebird<void> {
    let authSession: AuthenticationSession;
    const token = req.body.token;

    return new Bluebird(function (resolve, reject) {
      authSession = AuthenticationSessionHandler.get(req, vars.logger);
      vars.logger.info(req, "Initiate TOTP validation for user \"%s\".", authSession.userid);
      resolve();
    })
      .then(function () {
        return vars.userDataStore.retrieveTOTPSecret(authSession.userid);
      })
      .then(function (doc: TOTPSecretDocument) {
        if (!vars.totpHandler.validate(token, doc.secret.base32))
          return Bluebird.reject(new Error("Invalid TOTP token."));

        vars.logger.debug(req, "TOTP validation succeeded.");
        authSession.second_factor = true;
        Redirect(vars)(req, res);
        return Bluebird.resolve();
      })
      .catch(ErrorReplies.replyWithError200(req, res, vars.logger,
        UserMessages.OPERATION_FAILED));
  }
  return handler;
}
