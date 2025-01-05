---
sidebar_position: 30
title: Decentralised Access Control
---

import Disclaimer from '../\_disclaimer.mdx';

<Disclaimer />

## Overview

There is a balance between the demands of transparency (more supply chain visibility means it's harder to hide green-washing) and confidentiality (share too much data and you risk exposing commercial secrets). A key UNTP principle is that every supply chain actor should be able to choose their own balance between transparency and confidentiality. To achieve this, UNTP defines data confidentiality patterns with different degrees of data protection so that they can be appropriately combined to meet the confidentiality goals of each party. 

The ability to enforce access control to non-public data is a critical capability for any traceability and transparency framework. But when the non-public data is distributed across thousands of different systems and needs to be accessed by authorised parties previously unknown to the holder of the data, traditional access control systems will not work. A decentralised data architecture also needs a decentralised access control mechanism. 

## Conceptual Model

The conceptual model for decentralised access control is relatively simple. All non-public credentials are encrypted with a unique key for each credential. Access to encrypted data then boils down to the mechanism by which authorised parties acquire decryption keys from a data holder that may not know the requestor. There are only two ways to get keys.

1. **You already have the key:** The key is passed by the data holder to the data requestor by a separate channel. For example, to empower access to non-public data by the legitimate purchaser of the goods, the key could be located inside the packaging of the product. 
2. **You have a right to the key:** The key is made available to any data requestor that can prove their authorised role to the data holder via a [DID Authentication](https://w3c-ccg.github.io/vp-request-spec/#did-authentication). 

Each uniquely identified item will have a unique encryption key. Therefore the keys provided by either of the above methods is usable only to decrypt the data about a single facility/product/item.

Shared secrets and DID Authentication can be used in conjunction - for example a data holder may allow anonymous users to read non-public data with just a secret but may require both the secret (to prove item ownership) and DID Authentication (to confirm identity or role of the data requestor) to update item data.

![DAC Concept Model](DigitalIdentityAnchor.png)

The decryption of previously issued and encrypted verifiable credentials is preferred over any dynamic service because 

* The same encrypted UNTP credential is used for both the shared secret and DID authentication access models.
* The access control is easily delegated to Identity Provider services and can continue to work even after the original issuer is no longer in business.

## Requirements

* **data holder** is the party that created and maintains the information about a product or facility. Typically the product manufacturer or brand. The holder maintains both public and non-public data about the product or facility.
* **data requestor** is the party seeking access to product data held and maintained by the data holder. 

|ID|Name|Requirement|Examples|Solution Mapping|
|--|--|--|--|--|
|DAC-1|Anonymous access|As a data requestor that requires access to public product information, I should be able to access the information without any registration or identification - so that my privacy remains protected. |Human user or business system requests public data about an identified facility / product / serialised item. The data is returned.|[Anonymous public access](#anonymous-public-access)|
|DAC-2|Access by legitimate owner|As the legitimate owner or user of a specific serialised item, I should be able to access non-public information about my item and also be able to update post-sale life-cycle events such as usage and maintenance history without any need to register or identify myself to the data holder. |[Anonymous access with secret](#anonymous-access-with-secret)|
|DAC-3|Access with verifiable role|As an authorised actor such as an accredited recycling plant or a government authority, I should be able to access and update non-public product information in according to my authorised role even if I am otherwise unknown to the data holder.|An accredited recycling plant requests access to detailed recycling instructions for an end of life EV battery |[DID-Auth Access with DIA credential](#authenticated-access-with-dia-credential) `registrationScopeList` property|
|DAC-4|Access with verifiable identity|As a known and trusted data requestor party I should be able to prove my identity to the data holder and be granted access according to my permissions.|A trusted auditor requests access to details conformity evidence so that they can attest to the accuracy of a conformity assessment. |[DID-Auth Access with DIA credential](#authenticated-access-with-dia-credential) `registeredId` property|
|DAC-5|Confidential supply|As buyer that received credentials from my suppliers that provide confidence in the sustainability or quality of my upstream supply chain, I would like to pass on the sustainability or quality confidence to my customers without revealing the identity of my suppliers. |A cotton fabric manufacturer wants to provide verifiable evidence of organic cotton supply without identifying the raw cotton supplier|[N-tier supplier visibility](#n-tier-supplier-visibility) |
|DAC-6|Discoverability|As any data requestor that queries available data about a product or facility from an identity resolver service, I would like to understand not only what public data is available but also what confidential data is available and what evidence I need to provide to access the confidential data.|A repair facility wants to know whether a maintenance history is available for a given product ID, the resolver service responds with a set of maintenance link types but requires either the secret key or proof of authority to provide decryption keys.|[Discoverability of encrypted content](#discoverability-of-encrypted-content) |
|DAC-7|Durability| As a data requestor seeking information about a product or facility, I want to access the necessary data according to my role even if the original manufacturer is no longer in business and whether or not the data is open or confidential.| A recycling plant needs non-public data about electrical components made by a parts manufacturer that is no longer in business|[Durable storage options](#durable-storage-options)|
|DAC-8|Limit impact|The confidential data access scope associated with a specific secret key should be limited to one product or item so that the consequence of un-authorised access to confidential data minimised| |[Encryption granularity](#encryption-granularity) |
|DAC-9|Small footprint|Where space is tight then a small format secret key option is available.|A small but secure QR under a wine bottle cap provides access to data about that specific bottle.|[Secret key carrier](#secret-key-carrier)

## Decentralised Access Control



### Anonymous public access

Anonymous access to public data is the default UNTP access pattern. it is already described in the [identity resolver](IdentityResolver.md) specification. from a security and resilience perspective, the only requirements are 

* That data providers MUST NOT **require** personal identifying information from the data requestor as a condition of providing public information.
* That data SHOULD remain available for the lifetime of the product, irrespective of whether the original manufacturer still exists. 


### Encryption Granularity

All non-public documents and credentials SHOULD be encrypted.

* Encryption MUST be done with a symmetric encryption algorithm such as [AES](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197-upd1.pdf) with a minimum of 128 bit key length.
* Each distinct identified entity (i.e. facility, product, product batch, or serialised item with a unique IDR path) MUST use a separate and unique encryption key.  
* Where there are multiple different authorised roles that require access to different non-public data then a unique encryption key SHOULD be used for each role.
* Where there are multiple non-public documents or credentials for a given unique entity and authorised role then they SHOULD be encrypted with the same key.

These encryption requirements will result in an optimal granularity of encryption where one or more encrypted objects about a specific item and for access by a specific authorised role are all encrypted with the same key. But data for other roles or other items are not accessible with the given key. 


### Link Set Metadata

identity resolvers MUST include information to indicate when a link target is encrypted.

* When a link target is encrypted, the `encryptionMethod` custom property MUST be included with a value drawn from the [UNTP encryption method code list](https://test.uncefact.org/vocabulary/untp/core/0/encryptionMethodCode).
* When a link target is encrypted, the `accessRole` custom property MUST be included. The allowed values are an array of URIs that will be used to match against `registrationScopeList` in digital identity anchor credentials. 
* To indicate that access is allowed by any party that holds a secret key, the accessRole `untp:accessRole#Anonymous` MUST be included.

For example 

```json
{
    "linkset": [
        {
            "anchor": "https://resolver.product-register.com/01/90664869327",
            "https://vocabulary.uncefact.org/untp/linkType#digitalTraceabilityEvent": [
                {
                    "href": "https://sample-credential-store.com/credentials/dte-90664869327.json",
                    "title": "Battery maintenance event",
                    "type": "application/ld+json",
                    "lang": ["en"],
                    "encryptionMethod": "AES-128",
                    "accessRole":["untp:accessRole#Anonymous"]
                 }
            ]
        }
    ]
} 
```
Note that the example above assumes a machine IDR query with http header `Accept: application/json`

### Secret key carrier

The decryption key SHOULD be included with the product and be optimised for easy use. 

* The key MUST be presented as a QR code (either included with the product or, for bulk/raw materials, sent separately)
* The QR code MUST resolve to an [Identity Resolver](IdentityResolver.md) query URL for the given item and with the symmetric key secret as a `key` parameter.
* For cases with limited space such as a QR under a wine bottle cap, implementers MAY use a shorter URL that redirects to the same full identity resolver URL. The short URL SHOULD include 128 bit entropy so that it is sufficiently un-guessable.

For example, for a 128 bit AES key in a query to a resolver about product ID 90664869327 that returns only encrypted link targets for anonymous access

```
https://resolver.product-register.com/01/90664869327?key=2b7e151628aed2a6abf7158809cf4f3c&accessRole=untp%3AaccessRole%23Anonymous
```

A 128 bit short redirect URL (in capitals because that creates smaller QR codes)

```
HTTPS://REDIRECT.IO/E05778C659733E222758AC5179AE4611
```

These two URLs would produce the following QR codes

|Full resolver URL|Short redirect URL|
|--|--|
|![Full](QR-DACcomplexURLwithKey.png)|![Short](QR-DACshortRedirectURL.png)|


### Alternative secrets

 - product ID is a UUID and it **is** the secret so nothing more needed - returns unencrypted (but un-guessable) data).
 - Related business data is the secret


## Authenticated access


### With conventional login


### With DID-Auth DIA credential



### Decentralised authentication protocols

* DID Auth specification link : https://w3c-ccg.github.io/vp-request-spec/#did-authentication 
* DID SIOP specification link : https://openid.net/specs/openid-connect-self-issued-v2-1_0.html 
* OID4VP specification link : https://openid.net/specs/openid-4-verifiable-presentations-1_0.html 

| **Aspect**                | ** DID Authentication ** | **DID-SIOP**     | **OpenID4VP**     |
|---------------------------|-------------------|-------------|-------------------|
| **Primary Purpose**       | DID-based authentication with credential integration   | Decentralized login using OIDC        | Credential presentation in OIDC      |
| **Workflow Complexity**   | Moderate                                                             | Moderate                              | Complex                              |
| **OIDC Integration**      | No                                                                   | Yes                                   | Yes                                  |
| **Credential Support**    | Basic                                                                | Basic                                 | Comprehensive                        |
| **Use Case Focus**        | Proving DID control with credential attachment                        | Decentralized login                   | Claim verification and presentation  |


Use **DID Authentication** When:

- You need DID-based authentication with minimal credential integration.
- Lightweight and flexible workflows are sufficient.
- Simplicity and efficiency are priorities.

Use **DID-SIOP** When:

- You require OIDC-compatible decentralized login.
- Verifiable credentials are optional or straightforward.
- Integration with existing identity ecosystems is a requirement.

Use **OpenID4VP** When:

- You need advanced credential workflows, such as selective disclosure.
- Claims verification is critical to the use case.
- Privacy-preserving features and structured credential exchange are required.

THe best choice will eventually be the specification that demonstrates the widest market implementation. At this time, the UNTP recommendation is that implementers SHOULD use **DID-Authentication** but MAY use either **DID-SIOP** or **OpenID4VP**.


## N-tier supplier visibility


## Security Considerations


