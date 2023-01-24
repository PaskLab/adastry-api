# Account History

## epoch

Epoch for which the account history state applies.


## rewards

Refer to the **paid rewards** sent to the stake account at **epoch start**.

Those rewards are payment for blocks minted 2 epoch ago, calculated 1 epoch ago.

The active stake that determine the share of the rewards is from 3 epoch ago.

## mir

Stand for *"Moving instant rewards"*. ie: project catalyst voting rewards.

Those rewards are available immediately at the moment of the MIR transaction.

## refund

Refer to **refund rewards**. Pool deregistration refund is available at
the epoch where the deregistration certificate takes effect.

## activeStake

Active stake at the start of **epoch**. This stake will participate pool minting
the next epoch.

Rewards for this stake will be received 3 epochs from **epoch**.

## balance

This is the *calculated* active stake balance of the account at the start of 
**epoch**, excluding the stake account.

The formula used is the following:

    epochM0.activeStake - (epochM1.withdrawable - epochM1.withdrawn)


## withdrawable

Amount withdrawable from the stake account **between** the start and the end
of the epoch.

The formula used is the following:

    epochM1.withdrawable - epochM1.withdrawn 
      + epochM0.paidRewards + epochM0.MIRs + epochM0.refunds

## withdrawn

Total amount withdrawn during **epoch**

## opRewards

Paid operation fees from **epoch** - 2

## revisedRewards

Following multi-owned pool calculation, **revisedRewards** field will be populated
with the amount reflecting the account *share* of the total owners stake.

## stakeShare

Reflect the account *share* percentage in decimal of the total owners stake.

Based on the **balance** calculated field.

## pool

Pool to which the account is delegated at the start of **epoch**


## owner

Flag indicating that the account is registered in the owner section 
of a pool certificate.
