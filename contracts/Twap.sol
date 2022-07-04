// SPDX-License-Identifier: MIT

pragma solidity 0.7.6 ;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

contract Twap  {

    uint32 twapInterval = 30;
    address token0;
    address token1;
    address pool;

     constructor(address _token0, address _token1, address _pool){
        token0 = _token0;
        token1 = _token1;
        pool = _pool;
     }


    function getPrice(address tokenIn, uint128 amountIn) public view returns ( uint amountOut) {
        require(tokenIn == token0 || tokenIn == token1, "invalid token");
        address tokenOut = tokenIn == token0 ? token1 : token0;
       
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapInterval; // from (before)
        secondsAgos[1] = 0; // to (now)

        (int56[] memory tickCumulatives, ) = IUniswapV3Pool(pool).observe(secondsAgos);

        int24 tick = int24((tickCumulatives[1] - tickCumulatives[0]) / twapInterval);

        amountOut = OracleLibrary.getQuoteAtTick(tick, amountIn, tokenIn, tokenOut);
    }

}