import env from 'modules/client/env';
import { signInValues, initialSignInValues } from 'components/SignIn';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useEffect } from 'react';

const onCaptchaVerify = (token: string) => {
	signInValues.captchaToken = token;
};

const resetCaptchaToken = () => {
	signInValues.captchaToken = initialSignInValues.captchaToken;
};

const Captcha = () => {
	useEffect(resetCaptchaToken, []);

	return (
		<HCaptcha
			id="captcha"
			sitekey={env.HCAPTCHA_SITE_KEY}
			onVerify={onCaptchaVerify}
			onExpire={resetCaptchaToken}
		/>
	);
};

export default Captcha;